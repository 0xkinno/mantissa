# MANTISSA — Documentation & Verification Trail

MANTISSA is a private DeFi yield gateway on Starknet mainnet built on the STRK20
privacy pool. It shields STRK, routes capital through a guarded Cairo router into
real yield strategies (Forge/Endur, Reservoir/Vesu, Prism/AVNU), and returns the
result as a new private note.

This document summarizes the recent updates and verifications and links to the
primary artifacts. It is the audit trail behind [README.md](README.md).

## Recent updates

- **Mainnet lifecycle proof (2026-08-26).** A complete human-operated cycle is
  receipt-confirmed on mainnet: shield STRK → private Forge to Endur xSTRK →
  unshield STRK. Hashes and status live in [strk20.json](strk20.json) and
  [EVIDENCE.md](EVIDENCE.md).
- **MantissaRouter V3 deployed (2026-08-29).** Router at
  `0x74fc61266f234638786bcacc057b6bc7129f8f08c0e2d21a199d5e0b7f460bc` (same
  class `0x6111c076...2db6b`), deploy tx
  `0x16a3593f453f7dfaabfe13fc338a11f253a3a0af2cd9bfb5afc12a8112c05dd`; adds the
  Vesu V2 vSTRK v-token as both an allowed target and an allowed output token.
- **MantissaRouter V2 deployed.** Router at
  `0x327ce0db2f6f0e6abbae89a69245313072dbd3676d0c8090e58e71e56caddca` (class
  `0x6111c076cbcf20e031a6972c539c9e235f32584d27c32376b45a51187e2db6b`), deploy tx
  `0x744e395dcfa21f5cefb41dc96e248f80bcaf98ae2d833dd2507b0db2aa6cb3e`. Recorded in
  [router-deployment.json](router-deployment.json).
- **Receipt re-derivation verifier.** `scripts/verify-mainnet.mjs` re-reads every
  published hash from the Starknet RPC and reconstructs each checklist item from
  pool, token, and anonymizer events — it does not trust tx status or an explorer.
  The current output for the three real lifecycle transactions is embedded in the
  [What This Actually Proves](#) section of the README.
- **Seven router invariants, one focused Cairo test each.** `contracts/tests/`
  contains one test per advertised invariant (pool-only caller, no pool/self
  targets, approval reset, zero residue, minimum output, bounded calldata/steps,
  protocol allow-list) plus the plan-serialization test and a 400-case
  adversarial campaign: 9 Cairo tests in total.
  Verified 2026-08-28 with `snforge test`: **9 passed, 0 failed**.
  See [Security Invariants](README.md) and `contracts/tests/router_test.cairo`.
- **Reservoir and Prism builders.** Bounded Vesu (Reservoir) and AVNU (Prism)
  recipes are implemented. Prism is receipt-confirmed on mainnet through
  MantissaRouter V2 (block 14012996; hash below). Reservoir's recipe was
  unblocked 2026-08-29 by moving to the Vesu V2 vSTRK v-token
  (`0x6d6d2bf9...`, public ERC-4626 `deposit`) and redeploying the router as
  MantissaRouter V3 with the new v-token allow-listed; the exact router step
  simulates clean on live mainnet state and mints vSTRK to the router. A
  mainnet receipt is still pending; placeholder hashes are not claimed as
  evidence.
- **Prism mainnet receipt (2026-08-28).** Prism executed through MantissaRouter V2
  on mainnet: `0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3`
  (ACCEPTED_ON_L2 · SUCCEEDED · block 14012996). `scripts/verify-mainnet.mjs`
  re-derived every checklist item from receipt events: STRK20 pool touched,
  MantissaRouter invoked via `privacy_invoke`, protocol allow-list passed, ETH
  output note created, zero residue, minimum output threshold cleared. This is
  the first receipt-confirmed mainnet execution of MantissaRouter V2.

- **MantissaRouter V2 pre-flight (2026-08-28).** `scripts/simulate-router.mjs` builds each router plan exactly as MantissaRouter executes it and simulates it against live mainnet RPC state (no gas spent). Result: Forge (Endur xSTRK) settles clean; Prism (AVNU) route verified — AVNU `multi_route_swap` enforces `beneficiary == caller`, and the recipe pins the beneficiary to MantissaRouter; Reservoir (Vesu) verified **blocked at the protocol layer** — the allow-listed v-token `deposit()` accepts only its pool extension as caller (`'not-allowed'` on live mainnet state). Output embedded in README § Router V2 Pre-Flight.
- **Prism recipe fix (2026-08-28).** `buildAvnuRecipe` now pins the `multi_route_swap` beneficiary (calldata[8]) to MantissaRouter and derives the router's own minimum-output floor (99% of the quoted buy amount). `npm run typecheck` passes.
- **Class-hash pin (2026-08-28).** `scripts/verify-mainnet.mjs` now re-reads the deployed router's on-chain class hash and compares it to `router-deployment.json`: on-chain `0x6111c076…2db6b` matches the record.
- **Adversarial campaign test (2026-08-28).** A ninth Cairo test runs 400 hostile cases (100 non-allow-listed targets, 100 oversized calldata lengths, 100 oversized step counts, 100 below-floor outputs). `snforge test`: **9 passed, 0 failed**.
- **Browser verification (2026-08-28).** Playwright + Chromium confirmed `/`, `/yield`, `/private`, `/proof`, and `/compliance` all render. The MantissaRouter V2 / Endur anonymizer toggle is present in `src/app/private/page.tsx` and renders once a Wallet API 0.10+ wallet connects (wallet-gated, as documented).

## What has been verified

| Artifact | How it was verified |
|---|---|
| Shield / Forge / Unshield / Prism hashes | `node scripts/verify-mainnet.mjs <hash> …` re-derives each item from receipt events on `SN_MAIN` |
| Router deployment | `router-deployment.json` records class hash, deploy tx, allow-list, and output-token allow-list |
| Router invariants | 9 Cairo tests incl. 400-case adversarial campaign (`snforge test`) — **9 passed, 0 failed** (2026-08-28) |
| Protocol targets | Endur, Vesu, and AVNU addresses pinned in `src/lib/config.ts` and `.env.local.example` |
| STRK20 integration depth | [STRK20_INTEGRATION.md](STRK20_INTEGRATION.md) |

## Key files

- [README.md](README.md) — product, evidence, invariants, privacy boundary, limitations
- [DECISIONS.md](DECISIONS.md) — engineering decisions log (router V2→V3, Vesu v-token swap, AVNU beneficiary pin)
- [EVIDENCE.md](EVIDENCE.md) — evidence ledger
- [STRK20_INTEGRATION.md](STRK20_INTEGRATION.md) — primitive-by-primitive integration detail
- [strk20.json](strk20.json) — append-only transaction/contract ledger
- [router-deployment.json](router-deployment.json) — router deployment record
- [scripts/verify-mainnet.mjs](scripts/verify-mainnet.mjs) — receipt re-derivation verifier
- [contracts/src/router.cairo](contracts/src/router.cairo) — MantissaRouter source
- [contracts/tests/router_test.cairo](contracts/tests/router_test.cairo) — invariant tests
- [docs/PROGRESS.md](docs/PROGRESS.md) — build progress log
- [docs/SECURITY.md](docs/SECURITY.md) — security review notes


## Honest scope

Receipt-proven evidence now covers the STRK20-pool-to-Endur path (Forge, via the
Endur deposit anonymizer) and the STRK20-pool-to-AVNU path (Prism, executed
through MantissaRouter V2 at block 14012996). Reservoir has no receipt-confirmed
mainnet transaction yet. Its recipe is now pre-flight clean on live mainnet
state (Vesu V2 vSTRK minted to the router via MantissaRouter V3, verified
2026-08-29), but no receipt is claimed until a real, wallet-approved mainnet
transaction exists. See the **Limitations**
section of [README.md](README.md) for the full, honest scope.
