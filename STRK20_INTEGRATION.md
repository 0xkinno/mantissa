# STRK20 integration

| Primitive | Mantissa implementation |
|---|---|
| Shielded balances | `readShieldedBalances(account)` calls the wallet’s consent-gated `strk20Balances([])`. |
| Deposit / shield | `shieldAction(raw)` produces the canonical `deposit` action. |
| Private transfer | `transferAction(raw, recipient)` produces a pool-local transfer. |
| Unshield | `withdrawAction(raw, recipient)` produces the public withdrawal leg. |
| Custom anonymizer | Endur deposit anonymizer executes the private STRK → xSTRK path and returns an open xSTRK note. The generic router remains available for bounded Vesu/AVNU plans. |
| Multi-call composability | `encodePlan` serializes bounded steps and output note placeholders for one pool invoke. |
| Viewing keys | Wallet-mediated only; MANTISSA never handles the secret. |

## Runtime action shapes

```ts
await account.strk20InvokeTransaction([
  { type: "deposit", token: STRK_TOKEN_ADDRESS, amount: `0x${raw.toString(16)}` },
]);
```

Forge is receipt-proven on mainnet. Its atomic action sequence withdraws private STRK to Endur’s deposit anonymizer, creates an open xSTRK note, and invokes the anonymizer with normalized felt addresses and u256 amount limbs. The completed shield, Forge, and unshield hashes are listed in `strk20.json`.

```ts
const prepared = await account.strk20PrepareInvoke(actions, true);
// Inspect prepared.call.contractAddress and prepared.call.calldata here.
await account.strk20InvokeTransaction(actions);
```

The pool’s one-invoke constraint makes the router the composition boundary. Each step’s approvals are reset immediately, unknown targets are rejected by the allow-list, and every touched non-output token must end at zero.
