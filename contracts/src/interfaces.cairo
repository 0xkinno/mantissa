use starknet::ContractAddress;
use crate::types::{OpenNoteDeposit, Output, Step};

#[starknet::interface]
pub trait IERC20<TState> {
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait IMantissaRouter<TState> {
    fn privacy_invoke(
        ref self: TState,
        pool_address: ContractAddress,
        steps: Array<Step>,
        outputs: Array<Output>,
    ) -> Span<OpenNoteDeposit>;
    fn pool(self: @TState) -> ContractAddress;
    fn is_allowed(self: @TState, target: ContractAddress) -> bool;
    fn is_output_allowed(self: @TState, token: ContractAddress) -> bool;
}
