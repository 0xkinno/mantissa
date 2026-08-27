/// A bounded, allow-listed STRK20 yield router.
///
/// Safety invariants:
/// I1 pool-only caller; I2 no pool/self targets; I3 approvals reset per step;
/// I4 zero residue for non-output tokens; I5 minimum output; I6 bounded work;
/// I7 protocol allow-list; I8 reentrancy latch.
#[starknet::contract]
pub mod MantissaRouter {
    use core::num::traits::Zero;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::syscalls::call_contract_syscall;
    use starknet::{ContractAddress, SyscallResultTrait, get_caller_address, get_contract_address};
    use crate::interfaces::{
        IERC20Dispatcher, IERC20DispatcherTrait, IMantissaRouter,
    };
    use crate::types::{OpenNoteDeposit, Output, Step};

    #[storage]
    struct Storage {
        pool: ContractAddress,
        allowed: Map<ContractAddress, bool>,
        allowed_outputs: Map<ContractAddress, bool>,
        executions: u64,
        locked: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        StrategyExecuted: StrategyExecuted,
    }

    #[derive(Drop, starknet::Event)]
    struct StrategyExecuted {
        #[key]
        strategy_id: u64,
        step_count: u32,
        output_count: u32,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        pool: ContractAddress,
        allowed_targets: Span<ContractAddress>,
        allowed_outputs: Span<ContractAddress>,
    ) {
        assert(pool.is_non_zero(), 'MANTISSA_ZERO_POOL');
        self.pool.write(pool);
        let mut i: u32 = 0;
        while i < allowed_targets.len() {
            let target = *allowed_targets.at(i);
            assert(target.is_non_zero(), 'MANTISSA_ZERO_TARGET');
            self.allowed.write(target, true);
            i += 1;
        };
        let mut o: u32 = 0;
        while o < allowed_outputs.len() {
            let token = *allowed_outputs.at(o);
            assert(token.is_non_zero(), 'MANTISSA_ZERO_OUTPUT');
            self.allowed_outputs.write(token, true);
            o += 1;
        };
    }

    #[abi(embed_v0)]
    impl RouterImpl of IMantissaRouter<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            pool_address: ContractAddress,
            steps: Array<Step>,
            outputs: Array<Output>,
        ) -> Span<OpenNoteDeposit> {
            assert(get_caller_address() == self.pool.read(), 'MANTISSA_CALLER');
            assert(pool_address == self.pool.read(), 'MANTISSA_POOL');
            assert(!self.locked.read(), 'MANTISSA_REENTRANT');
            assert(steps.len().is_non_zero(), 'MANTISSA_NO_STEPS');
            assert(steps.len() <= 8, 'MANTISSA_STEPS');

            self.locked.write(true);
            let self_address = get_contract_address();
            let mut touched: Array<ContractAddress> = array![];

            let mut i: u32 = 0;
            while i < steps.len() {
                let step = steps.at(i);
                assert(self.allowed.read(*step.target), 'MANTISSA_NOT_ALLOWED');
                assert(*step.target != pool_address, 'MANTISSA_TARGET_POOL');
                assert(*step.target != self_address, 'MANTISSA_TARGET_SELF');
                assert(step.calldata.len() <= 64, 'MANTISSA_CALLDATA');

                let mut j: u32 = 0;
                while j < step.approvals.len() {
                    let approval = *step.approvals.at(j);
                    IERC20Dispatcher { contract_address: approval.token }
                        .approve(*step.target, approval.amount.into());
                    append_unique(ref touched, approval.token);
                    j += 1;
                };

                call_contract_syscall(*step.target, *step.selector, step.calldata.span())
                    .unwrap_syscall();

                let mut k: u32 = 0;
                while k < step.approvals.len() {
                    let approval = *step.approvals.at(k);
                    IERC20Dispatcher { contract_address: approval.token }
                        .approve(*step.target, 0_u256);
                    k += 1;
                };
                i += 1;
            };

            let mut deposits: Array<OpenNoteDeposit> = array![];
            let mut output_tokens: Array<ContractAddress> = array![];
            let mut o: u32 = 0;
            while o < outputs.len() {
                let output = *outputs.at(o);
                assert(output.token.is_non_zero(), 'MANTISSA_OUTPUT');
                assert(self.allowed_outputs.read(output.token), 'MANTISSA_OUTPUT_NOT_ALLOWED');
                assert(!contains(output_tokens.span(), output.token), 'MANTISSA_DUP_OUTPUT');
                output_tokens.append(output.token);

                let token = IERC20Dispatcher { contract_address: output.token };
                let balance = token.balance_of(self_address);
                let amount: u128 = balance.try_into().expect('MANTISSA_OVERFLOW');
                assert(amount >= output.min_amount, 'MANTISSA_MIN_OUTPUT');
                token.approve(pool_address, balance);
                deposits.append(
                    OpenNoteDeposit {
                        note_id: output.note_id,
                        token: output.token,
                        amount,
                    },
                );
                o += 1;
            };

            let mut t: u32 = 0;
            while t < touched.len() {
                let token_address = *touched.at(t);
                if !contains(output_tokens.span(), token_address) {
                    assert(
                        IERC20Dispatcher { contract_address: token_address }
                            .balance_of(self_address)
                            .is_zero(),
                        'MANTISSA_RESIDUE',
                    );
                }
                t += 1;
            };

            let strategy_id = self.executions.read() + 1;
            self.executions.write(strategy_id);
            self.locked.write(false);
            self.emit(
                StrategyExecuted {
                    strategy_id,
                    step_count: steps.len(),
                    output_count: outputs.len(),
                },
            );
            deposits.span()
        }

        fn pool(self: @ContractState) -> ContractAddress {
            self.pool.read()
        }

        fn is_allowed(self: @ContractState, target: ContractAddress) -> bool {
            self.allowed.read(target)
        }

        fn is_output_allowed(self: @ContractState, token: ContractAddress) -> bool {
            self.allowed_outputs.read(token)
        }
    }

    fn contains(values: Span<ContractAddress>, needle: ContractAddress) -> bool {
        let mut i: u32 = 0;
        while i < values.len() {
            if *values.at(i) == needle {
                return true;
            }
            i += 1;
        };
        false
    }

    fn append_unique(ref values: Array<ContractAddress>, value: ContractAddress) {
        if !contains(values.span(), value) {
            values.append(value);
        }
    }
}
