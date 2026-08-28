// Test mocks: a minimal ERC-20 and a no-op target used by the router invariant
// tests. They are compiled only so snforge can declare and deploy them.
use starknet::ContractAddress;

#[starknet::interface]
pub trait IMockERC20<TState> {
    fn name(self: @TState) -> felt252;
    fn symbol(self: @TState) -> felt252;
    fn decimals(self: @TState) -> u8;
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn allowance(self: @TState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
    fn transfer(ref self: TState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TState, sender: ContractAddress, recipient: ContractAddress, amount: u256
    ) -> bool;
    fn mint(ref self: TState, to: ContractAddress, amount: u256);
}

#[starknet::interface]
pub trait IMockTarget<TState> {
    fn ping(ref self: TState);
    fn spend(ref self: TState, token: ContractAddress, amount: u256);
    fn reenter(ref self: TState, router: ContractAddress, pool: ContractAddress);
}

#[starknet::contract]
pub mod MockERC20 {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IMockERC20;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: felt252, symbol: felt252, decimals: u8) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of IMockERC20<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self.allowances.write((owner, spender), amount);
            true
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self.transfer_internal(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let allowed = self.allowances.read((sender, caller));
            assert(allowed >= amount, 'MOCK_INSUFFICIENT_ALLOWANCE');
            self.allowances.write((sender, caller), allowed - amount);
            self.transfer_internal(sender, recipient, amount);
            true
        }

        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.balances.write(to, self.balances.read(to) + amount);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn transfer_internal(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256
        ) {
            self.balances.write(from, self.balances.read(from) - amount);
            self.balances.write(to, self.balances.read(to) + amount);
        }
    }
}

#[starknet::contract]
#[feature("safe_dispatcher")]
pub mod MockTarget {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{IMockERC20Dispatcher, IMockERC20DispatcherTrait, IMockTarget};
    use crate::interfaces::{IMantissaRouterSafeDispatcher, IMantissaRouterSafeDispatcherTrait};

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockTargetImpl of IMockTarget<ContractState> {
        fn ping(ref self: ContractState) {}

        fn spend(ref self: ContractState, token: ContractAddress, amount: u256) {
            // Pulls `amount` from the caller (the router during a router step).
            let owner = get_caller_address();
            IMockERC20Dispatcher { contract_address: token }
                .transfer_from(owner, get_contract_address(), amount);
        }

        fn reenter(ref self: ContractState, router: ContractAddress, pool: ContractAddress) {
            // Re-enters the router from inside an active strategy step. The router's
            // reentrancy latch must reject the nested call.
            let safe = IMantissaRouterSafeDispatcher { contract_address: router };
            match safe.privacy_invoke(pool, array![], array![]) {
                Result::Ok(_) => panic!("router accepted a reentrant call"),
                Result::Err(data) => panic(data),
            };
        }
    }
}
