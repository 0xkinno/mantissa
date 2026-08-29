# Progress

2026-08-25 — Read both instruction files completely. Cloned Jalin, starter kit, privacy SDK, awesome-strk20, Cloakra, and Facet under `references/`. Initialized product shell, wallet integration, strategy encoder, router contract, evidence script, and required documentation.
2026-08-26 — Completed the first human-operated mainnet lifecycle: shield STRK, private Forge to Endur xSTRK, and unshield STRK. Receipt hashes are recorded in `strk20.json` and `EVIDENCE.md`.
2026-08-25 — Added security review, STRK20 runtime action snippets, competitor differentiation evidence, and receipt-verifier hardening.

### Reservoir / Prism integration update (2026-08-26)

- Verified live Vesu `deposit(assets, receiver)` calldata and added a bounded `buildVesuRecipe` helper.
- Verified live AVNU v3 private build responses on `SN_MAIN`; added `buildAvnuRecipe` with executor allow-list, output-token, and 64-felt calldata guards.
- AVNU routes are simulation-only until a connected Wallet API 0.10+ wallet resolves the pool and open-note placeholders and the user explicitly approves the call.
- No Reservoir or Prism mainnet transaction is claimed or recorded without a real accepted receipt.

### Prism mainnet receipt (2026-08-28)

- Prism executed through MantissaRouter V2 on mainnet: `0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3`, ACCEPTED_ON_L2 · SUCCEEDED, block 14012996. STRK in → ETH out; approvals reset to zero; router balance ends at zero.
- `scripts/verify-mainnet.mjs` re-derived every checklist item from receipt events: STRK20 pool touched, MantissaRouter invoked via `privacy_invoke`, protocol allow-list passed (MantissaRouter V2 address matched), ETH output note created, zero residue, minimum output threshold cleared.
- Prism is the first receipt-confirmed mainnet execution of MantissaRouter V2.

### Reservoir status (2026-08-28)

- In progress. Pre-flight verified the allow-listed Vesu v-token `deposit()` accepts only its pool extension as caller (`'not-allowed'` on live mainnet state).
- A working Reservoir needs a pool-targeted recipe (Vesu pool `modify_position`) and a router redeploy with the Vesu pool allow-listed. No mainnet receipt is claimed.
