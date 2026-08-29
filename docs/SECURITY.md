# Security review notes

## Router invariants

- Only the configured STRK20 pool may call `privacy_invoke`.
- The supplied pool address must equal the immutable pool address.
- Targets must be nonzero, allow-listed, and cannot be the pool or router itself.
- Each plan is capped at 8 steps and 64 calldata felts per step.
- ERC-20 approvals are reset to zero after every external call.
- Every touched non-output token must have zero residual balance.
- Outputs must be nonzero, unique, allow-listed, and meet their minimum amount.
- A reentrancy latch prevents nested execution.

## Wallet boundary

MANTISSA never receives a viewing key or private key. Shield, private Forge, balance reads, and unshield are submitted through the connected Wallet API 0.10+ `WalletAccountV6` implementation. Wallet placeholders are resolved by the wallet; the UI exposes `strk20PrepareInvoke(..., true)` so a user can inspect the resolved call before signing.

## Known limitations

- Mainnet lifecycle evidence depends on a user-approved STRK20-capable wallet session.
- Reservoir and Prism were gated until exact live calldata and output mappings were verified; both are now receipt-confirmed on mainnet (Prism block 14012996, Reservoir block 14038277).
- The router is immutable; changing the allow-list requires a new deployment.
- No APY or gas ceiling is enforced on-chain; UI copy must treat quoted APY as informational.
