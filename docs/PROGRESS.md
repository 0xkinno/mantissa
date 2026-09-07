# Progress
2026-09-07 - Discovery-build pass: reference repositories for protocol and privacy-layer research are consolidated under references/ (gitignored, never shipped). Scaffolded DISCOVERY.md, the caller-identity preflight library, and the systematic audit evidence file.
- Completed the systematic caller-identity audit sweep (Endur, Vesu V2/V2.1, AVNU, and Ekubo router/core) on live mainnet state; wrote evidence/audit-caller-identity.json + evidence/ekubo-probe.json.
- Ran the controlled before/after proof (AVNU beneficiary pin, Vesu v-token swap): evidence/prove-caller-identity-tax-{avnu,vesu}.json + .txt.
- Added the public preflight CLI scripts/check-caller-identity.mjs and documented it in STRK20_INTEGRATION.md.
- Re-ran the Cairo suite: 9 passed, 0 failed, incl. the 400-case adversarial campaign (evidence/snforge-9-of-9.txt).
- Re-derived all five mainnet receipts with verify-mainnet.mjs --all (evidence/mainnet-verify-5-of-5.txt).
- Added evidence/claims.json (10 claims, each tied to an artifact + regeneration command).
- Measured the pool fee schedule on-chain (scripts/fee-check.mjs; evidence/pool-fee.json): flat 6 STRK per operation.
- Implemented the settlement-digest schema + Stark-curve verifier (scripts/settlement-digest.mjs) and added the Settlement Proof card to /compliance.
- Rebuilt the README: Status-at-a-Glance, Tests & Evidence mapping, Router Pre-Flight, Limitations, What This Costs, For Other Builders; removed all project references from shipped docs per directive.
- Completed the README hero rewrite (Step 7): Pain → Product → Proof → Mechanism beats, neutral framing, nothing below How It Works touched.
- Added the discovery-by-discovery delta to docs/COMPETITIVE_ANALYSIS.md (internal-only, gitignored, never ships).
- Added the Reservoir row to the EVIDENCE.md lifecycle table and rewrote the record template to archive tense.
- Gitignored the root-level working directive MANTISSA_DISCOVERY.md so research/reference material never ships.
- Added a 25-test TypeScript regression suite (vitest: recipe guards, pool-event decoding against real mainnet fixtures, evidence-snapshot checks) and a GitHub Actions CI workflow (typecheck, tests, build, Cairo suite; mainnet receipt re-derivation when an RPC secret is configured).
- Shipped the live per-action disclosure in /private: the pool's own Deposit/Withdrawal traffic in the user's rough size band is measured before signing and reported plainly when thin or empty (src/lib/poolTraffic.ts, src/components/BandDisclosure.tsx).
- Moved the full 5-of-5 re-derivation block out of the README into EVIDENCE.md and tightened the README test/CI claims.
2026-08-25 — Read both instruction files completely. Cloned protocol SDK and privacy-primitive reference material under `references/` (kept local, not shipped). Initialized product shell, wallet integration, strategy encoder, router contract, evidence script, and required documentation.
2026-08-26 — Completed the first human-operated mainnet lifecycle: shield STRK, private Forge to Endur xSTRK, and unshield STRK. Receipt hashes are recorded in `strk20.json` and `EVIDENCE.md`.
2026-08-25 — Added security review, STRK20 runtime action snippets, differentiation and positioning evidence, and receipt-verifier hardening.

### Reservoir / Prism integration update (2026-08-26)

- Verified live Vesu `deposit(assets, receiver)` calldata and added a bounded `buildVesuRecipe` helper.
- Verified live AVNU v3 private build responses on `SN_MAIN`; added `buildAvnuRecipe` with executor allow-list, output-token, and 64-felt calldata guards.
- AVNU routes are simulation-only until a connected Wallet API 0.10+ wallet resolves the pool and open-note placeholders and the user explicitly approves the call.
- No Reservoir or Prism mainnet transaction is claimed or recorded without a real accepted receipt.

### Prism mainnet receipt (2026-08-28)

- Prism executed through MantissaRouter V2 on mainnet: `0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3`, ACCEPTED_ON_L2 · SUCCEEDED, block 14012996. STRK in → ETH out; approvals reset to zero; router balance ends at zero.
- `scripts/verify-mainnet.mjs` re-derived every checklist item from receipt events: STRK20 pool touched, MantissaRouter invoked via `privacy_invoke`, protocol allow-list passed (MantissaRouter V2 address matched), ETH output note created, zero residue, minimum output threshold cleared.
- Prism is the first receipt-confirmed mainnet execution of MantissaRouter V2.

### Reservoir status (2026-08-28) — superseded 2026-08-29 by the receipt below

- In progress. Pre-flight verified the allow-listed Vesu v-token `deposit()` accepts only its pool extension as caller (`'not-allowed'` on live mainnet state).
- A working Reservoir needs a pool-targeted recipe (Vesu pool `modify_position`) and a router redeploy with the Vesu pool allow-listed. No mainnet receipt is claimed.
### Reservoir mainnet receipt (2026-08-29)

- Reservoir executed through MantissaRouter V3 on mainnet: `0x06f749fafee519140c48f57d1882b04f3107fb453728d84d57bc0aa63c85acc8`, ACCEPTED_ON_L2 · SUCCEEDED, block 14038277. STRK in → Vesu vSTRK out; approvals reset to zero; router balance ends at zero.
- `scripts/verify-mainnet.mjs` re-derived every checklist item from receipt events: STRK20 pool touched, MantissaRouter invoked via `privacy_invoke`, protocol allow-list passed (MantissaRouter V3 / Vesu V2 vSTRK v-token matched), Vesu vSTRK output note created, zero residue, minimum output threshold cleared.
- Reservoir is the first receipt-confirmed mainnet execution of MantissaRouter V3. All three strategies (Forge, Reservoir, Prism) plus shield and unshield are now receipt-confirmed on mainnet; `verify-mainnet.mjs --all` re-derives 5 of 5.