use starknet::ContractAddress;

#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub struct Approval {
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Serde, Drop)]
pub struct Step {
    pub target: ContractAddress,
    pub selector: felt252,
    pub approvals: Array<Approval>,
    pub calldata: Array<felt252>,
}

#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub struct Output {
    pub token: ContractAddress,
    pub note_id: felt252,
    pub min_amount: u128,
}
