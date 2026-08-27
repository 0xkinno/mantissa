use mantissa_router::types::{Approval, OpenNoteDeposit, Output, Step};
use starknet::ContractAddress;

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
