use mantissa_router::types::{Approval, OpenNoteDeposit, Output, Step};
use mantissa_router::interfaces::{
    IMantissaRouterDispatcher, IMantissaRouterDispatcherTrait, IMantissaRouterSafeDispatcher,
    IMantissaRouterSafeDispatcherTrait,
};
use mantissa_router::mocks::{IMockERC20Dispatcher, IMockERC20DispatcherTrait};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use snforge_std::{start_cheat_caller_address, stop_cheat_caller_address};
use starknet::ContractAddress;
use starknet::contract_address_const;

#[test]
fn plan_types_serialize_with_expected_shapes() {
    let zero: ContractAddress = 0.try_into().unwrap();
    let approval = Approval { token: zero, amount: 1_u128 };
    let step = Step { target: zero, selector: 'deposit', approvals: array![approval], calldata: array![] };
    let output = Output { token: zero, note_id: 0, min_amount: 1_u128 };
    let note = OpenNoteDeposit { note_id: 0, token: zero, amount: 1_u128 };
    assert(step.approvals.len() == 1, 'approval shape');
    assert(output.min_amount == note.amount, 'output shape');
}

// ---------------------------------------------------------------------------
// Router invariants: one focused test per advertised invariant.
// I1 pool-only caller, I2 no pool/self targets, I3 approvals reset per step,
// I4 zero residue, I5 minimum output, I6 bounded work, I7 protocol allow-list.
// ---------------------------------------------------------------------------

struct Deployed {
    router: ContractAddress,
    pool: ContractAddress,
    token: ContractAddress,
    output_token: ContractAddress,
    target: ContractAddress,
}

fn deploy_with_allowed(allowed_extra: Span<ContractAddress>) -> Deployed {
    let pool = contract_address_const::<0x100>();
    let token_class = declare("MockERC20").unwrap().contract_class();
    let (token, _) = token_class.deploy(@array!['MOCK', 'MOCK', 18]).unwrap();
    let (output_token, _) = token_class.deploy(@array!['OUT', 'OUT', 18]).unwrap();
    let target_class = declare("MockTarget").unwrap().contract_class();
    let (target, _) = target_class.deploy(@array![]).unwrap();

    let router_class = declare("MantissaRouter").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![];
    calldata.append(pool.into());
    calldata.append((1 + allowed_extra.len()).into());
    calldata.append(target.into());
    let mut i: u32 = 0;
    while i < allowed_extra.len() {
        calldata.append((*allowed_extra.at(i)).into());
        i += 1;
    };
    calldata.append(1);
    calldata.append(output_token.into());
    let (router, _) = router_class.deploy(@calldata).unwrap();

    Deployed { router, pool, token, output_token, target }
}

fn deploy() -> Deployed {
    deploy_with_allowed(array![].span())
}

fn assert_panic(data: Array<felt252>, expected: felt252) {
    // snforge reports contract-call panic data as [message, 'ENTRYPOINT_FAILED'],
    // so match the expected guard message anywhere in the returned data.
    let data = data.span();
    let mut i: u32 = 0;
    while i < data.len() {
        if *data.at(i) == expected {
            return;
        };
        i += 1;
    };
    panic!("expected panic data not found");
}

fn assert_panic_any(data: Array<felt252>, a: felt252, b: felt252) {
    let data = data.span();
    let mut i: u32 = 0;
    while i < data.len() {
        if *data.at(i) == a || *data.at(i) == b {
            return;
        };
        i += 1;
    };
    panic!("expected panic data not found");
}

#[test]
#[feature("safe_dispatcher")]
fn invariant1_rejects_non_pool_caller() {
    let d = deploy();
    // The default test caller is not the configured pool, so the router must reject.
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };
    match safe.privacy_invoke(d.pool, array![], array![]) {
        Result::Ok(_) => panic!("non-pool caller was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_CALLER'),
    };
}

#[test]
#[feature("safe_dispatcher")]
fn invariant2_rejects_step_targeting_pool_or_router() {
    // Allow-list the pool so the target guards are what actually fail:
    // this exercises the no-pool-target and no-router-target rules directly.
    let pool_addr = contract_address_const::<0x100>();
    let d = deploy_with_allowed(array![pool_addr].span());
    start_cheat_caller_address(d.router, d.pool);
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };

    // A step targeting the pool itself must be rejected by the target guard.
    let pool_step = Step {
        target: d.pool, selector: selector!("ping"), approvals: array![], calldata: array![],
    };
    match safe.privacy_invoke(d.pool, array![pool_step], array![]) {
        Result::Ok(_) => panic!("pool-targeted step was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_TARGET_POOL'),
    };

    // A step targeting the router itself must be rejected. The router can never
    // be allow-listed (its allow-list is fixed at construction), so the rejection
    // fires as the self-target guard or the allow-list guard.
    let self_step = Step {
        target: d.router, selector: selector!("ping"), approvals: array![], calldata: array![],
    };
    match safe.privacy_invoke(d.pool, array![self_step], array![]) {
        Result::Ok(_) => panic!("router-targeted step was accepted"),
        Result::Err(data) => assert_panic_any(data, 'MANTISSA_TARGET_SELF', 'MANTISSA_NOT_ALLOWED'),
    };

    // A step that re-enters the router must trip the reentrancy latch.
    let reentrant_step = Step {
        target: d.target,
        selector: selector!("reenter"),
        approvals: array![],
        calldata: array![d.router.into(), d.pool.into()],
    };
    match safe.privacy_invoke(d.pool, array![reentrant_step], array![]) {
        Result::Ok(_) => panic!("reentrant step was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_REENTRANT'),
    };
    stop_cheat_caller_address(d.router);
}

#[test]
fn invariant3_resets_approvals_after_step() {
    let d = deploy();
    start_cheat_caller_address(d.router, d.pool);

    let token = IMockERC20Dispatcher { contract_address: d.token };
    token.mint(d.router, 100_u256);

    let step = Step {
        target: d.target,
        selector: selector!("spend"),
        approvals: array![Approval { token: d.token, amount: 100_u128 }],
        calldata: array![d.token.into(), 100, 0],
    };
    let output = Output { token: d.output_token, note_id: 1, min_amount: 0 };
    let router = IMantissaRouterDispatcher { contract_address: d.router };
    let deposits = router.privacy_invoke(d.pool, array![step], array![output]);

    assert(token.allowance(d.router, d.target) == 0_u256, 'approval not reset to zero');
    assert(token.balance_of(d.router) == 0_u256, 'router balance not zero');
    assert(token.balance_of(d.target) == 100_u256, 'target did not receive funds');
    assert(deposits.len() == 1, 'expected one output deposit');
    stop_cheat_caller_address(d.router);
}

#[test]
#[feature("safe_dispatcher")]
fn invariant4_rejects_router_residue() {
    let d = deploy();
    start_cheat_caller_address(d.router, d.pool);

    let token = IMockERC20Dispatcher { contract_address: d.token };
    token.mint(d.router, 100_u256);

    // The target only pings, so the approved STRK stays on the router: residue.
    let step = Step {
        target: d.target,
        selector: selector!("ping"),
        approvals: array![Approval { token: d.token, amount: 100_u128 }],
        calldata: array![],
    };
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };
    match safe.privacy_invoke(d.pool, array![step], array![]) {
        Result::Ok(_) => panic!("non-zero residue was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_RESIDUE'),
    };
    stop_cheat_caller_address(d.router);
}

#[test]
#[feature("safe_dispatcher")]
fn invariant5_rejects_output_below_floor() {
    let d = deploy();
    start_cheat_caller_address(d.router, d.pool);

    let output_token = IMockERC20Dispatcher { contract_address: d.output_token };
    output_token.mint(d.router, 5_u256);

    let step = Step {
        target: d.target, selector: selector!("ping"), approvals: array![], calldata: array![],
    };
    let output = Output { token: d.output_token, note_id: 2, min_amount: 10 };
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };
    match safe.privacy_invoke(d.pool, array![step], array![output]) {
        Result::Ok(_) => panic!("below-floor output was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_MIN_OUTPUT'),
    };
    stop_cheat_caller_address(d.router);
}

#[test]
#[feature("safe_dispatcher")]
fn invariant6_rejects_oversized_work() {
    let d = deploy();
    start_cheat_caller_address(d.router, d.pool);
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };

    // 65 calldata felts exceed the 64-felt cap.
    let mut big_calldata: Array<felt252> = array![];
    let mut i: u32 = 0;
    while i < 65 {
        big_calldata.append(i.into());
        i += 1;
    };
    let big_step = Step {
        target: d.target,
        selector: selector!("ping"),
        approvals: array![],
        calldata: big_calldata,
    };
    match safe.privacy_invoke(d.pool, array![big_step], array![]) {
        Result::Ok(_) => panic!("oversized calldata was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_CALLDATA'),
    };

    // 9 steps exceed the 8-step cap.
    let mut many_steps: Array<Step> = array![];
    let mut j: u32 = 0;
    while j < 9 {
        many_steps.append(
            Step {
                target: d.target,
                selector: selector!("ping"),
                approvals: array![],
                calldata: array![],
            },
        );
        j += 1;
    };
    match safe.privacy_invoke(d.pool, many_steps, array![]) {
        Result::Ok(_) => panic!("oversized step count was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_STEPS'),
    };
    stop_cheat_caller_address(d.router);
}

#[test]
#[feature("safe_dispatcher")]
fn invariant7_rejects_non_allowlisted_target() {
    let d = deploy();
    start_cheat_caller_address(d.router, d.pool);

    let rogue = contract_address_const::<0xBAD>();
    let step = Step {
        target: rogue, selector: selector!("ping"), approvals: array![], calldata: array![],
    };
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };
    match safe.privacy_invoke(d.pool, array![step], array![]) {
        Result::Ok(_) => panic!("non-allow-listed target was accepted"),
        Result::Err(data) => assert_panic(data, 'MANTISSA_NOT_ALLOWED'),
    };
    stop_cheat_caller_address(d.router);
}


// ---------------------------------------------------------------------------
// Tier 1 adversarial campaign: 400 hostile parameter cases against the guards.
// One test, four sweeps (100 cases each): non-allow-listed targets, oversized
// calldata, oversized step counts, and below-floor outputs. Every case must be
// rejected with the exact guard message; any acceptance fails the campaign.
// ---------------------------------------------------------------------------

#[test]
#[feature("safe_dispatcher")]
fn invariant_adversarial_campaign_rejects_hostile_plans() {
    let d = deploy();
    start_cheat_caller_address(d.router, d.pool);
    let safe = IMantissaRouterSafeDispatcher { contract_address: d.router };

    // Sweep 1 — 100 non-allow-listed targets must all hit MANTISSA_NOT_ALLOWED.
    let mut i: u32 = 0;
    while i < 100 {
        let raw: felt252 = 0xBADD00 + i.into();
        let rogue: ContractAddress = raw.try_into().unwrap();
        let step = Step {
            target: rogue,
            selector: selector!("ping"),
            approvals: array![],
            calldata: array![],
        };
        match safe.privacy_invoke(d.pool, array![step], array![]) {
            Result::Ok(_) => panic!("rogue target was accepted"),
            Result::Err(data) => assert_panic(data, 'MANTISSA_NOT_ALLOWED'),
        };
        i += 1;
    };

    // Sweep 2 — calldata lengths 65..164 must all hit MANTISSA_CALLDATA.
    let mut c: u32 = 0;
    while c < 100 {
        let mut calldata: Array<felt252> = array![];
        let mut f: u32 = 0;
        while f < 65 + c {
            calldata.append(f.into());
            f += 1;
        };
        let step = Step {
            target: d.target,
            selector: selector!("ping"),
            approvals: array![],
            calldata,
        };
        match safe.privacy_invoke(d.pool, array![step], array![]) {
            Result::Ok(_) => panic!("oversized calldata was accepted"),
            Result::Err(data) => assert_panic(data, 'MANTISSA_CALLDATA'),
        };
        c += 1;
    };

    // Sweep 3 — step counts 9..108 must all hit MANTISSA_STEPS.
    let mut s_cnt: u32 = 0;
    while s_cnt < 100 {
        let mut steps: Array<Step> = array![];
        let mut s_i: u32 = 0;
        while s_i < 9 + s_cnt {
            steps.append(
                Step {
                    target: d.target,
                    selector: selector!("ping"),
                    approvals: array![],
                    calldata: array![],
                },
            );
            s_i += 1;
        };
        match safe.privacy_invoke(d.pool, steps, array![]) {
            Result::Ok(_) => panic!("oversized step count was accepted"),
            Result::Err(data) => assert_panic(data, 'MANTISSA_STEPS'),
        };
        s_cnt += 1;
    };

    // Sweep 4 — output floors above the 5-token balance (6..105) must all hit
    // MANTISSA_MIN_OUTPUT.
    let output_token = IMockERC20Dispatcher { contract_address: d.output_token };
    output_token.mint(d.router, 5_u256);
    let mut m: u32 = 0;
    while m < 100 {
        let step = Step {
            target: d.target,
            selector: selector!("ping"),
            approvals: array![],
            calldata: array![],
        };
        let output = Output { token: d.output_token, note_id: 2, min_amount: 6_u128 + m.into() };
        match safe.privacy_invoke(d.pool, array![step], array![output]) {
            Result::Ok(_) => panic!("below-floor output was accepted"),
            Result::Err(data) => assert_panic(data, 'MANTISSA_MIN_OUTPUT'),
        };
        m += 1;
    };

    stop_cheat_caller_address(d.router);
}
