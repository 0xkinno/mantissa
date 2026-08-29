# STRK20 integration

| Primitive | Mantissa implementation |
|---|---|
| Shielded balances | `readShieldedBalances(account)` calls the wallet’s consent-gated `strk20Balances([])`. |
| Deposit / shield | `shieldAction(raw)` produces the canonical `deposit` action. |
| Private transfer | `transferAction(raw, recipient)` produces a pool-local transfer. |
| Unshield | `withdrawAction(raw, recipient)` produces the public withdrawal leg. |
| Custom anonymizer | Endur deposit anonymizer executes the private STRK → xSTRK path (Forge) and returns an open xSTRK note. MantissaRouter V2 executes AVNU `multi_route_swap` (Prism, ETH out) and MantissaRouter V3 executes the Vesu V2 vSTRK ERC-4626 `deposit` (Reservoir, vSTRK out); all three strategies are receipt-confirmed on mainnet. |
| Multi-call composability | `encodePlan` serializes bounded steps and output note placeholders for one pool invoke. |
| Viewing keys | Wallet-mediated only; MANTISSA never handles the secret. |

## Runtime action shapes

```ts
await account.strk20InvokeTransaction([
  { type: "deposit", token: STRK_TOKEN_ADDRESS, amount: `0x${raw.toString(16)}` },
]);
```

All three strategies are receipt-proven on mainnet. Forge’s atomic action sequence withdraws private STRK to Endur’s deposit anonymizer, creates an open xSTRK note, and invokes the anonymizer with normalized felt addresses and u256 amount limbs. Reservoir runs the same router boundary through MantissaRouter V3: the router approves STRK to the Vesu V2 vSTRK v-token and calls `deposit(assets, receiver)`, vSTRK is minted to the router, and the pool opens it as a private note (block 14038277). Prism runs through MantissaRouter V2: the router approves STRK to AVNU and calls `multi_route_swap` with the beneficiary pinned to the router — AVNU enforces `beneficiary == caller` — and the ETH proceeds are opened as a private note (block 14012996). The completed shield, Forge, unshield, Reservoir, and Prism hashes are listed in `strk20.json`.

```ts
const prepared = await account.strk20PrepareInvoke(actions, true);
// Inspect prepared.call.contractAddress and prepared.call.calldata here.
await account.strk20InvokeTransaction(actions);
```

The pool’s one-invoke constraint makes the router the composition boundary. Each step’s approvals are reset immediately, unknown targets are rejected by the allow-list, and every touched non-output token must end at zero.
