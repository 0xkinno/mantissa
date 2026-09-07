# Evidence ledger

MantissaRouter V2 and V3 are deployed on Starknet mainnet and the evidence ledger is rendered by `/proof`. The repository contains verified deployment receipts, protocol target research, bounded Vesu Reservoir and AVNU Prism builders, and wallet-resolved runtime preview support.

Confirmed deployment and lifecycle evidence is recorded in `strk20.json`; explorer links are generated for every ledger entry. Receipt-confirmed mainnet evidence now covers shield STRK, private Forge to Endur xSTRK, unshield STRK, Prism (STRK → AVNU ETH through MantissaRouter V2), and Reservoir (STRK → Vesu vSTRK through MantissaRouter V3, `0x06f749fa...c85acc8`, block 14038277) — all five lifecycle transactions re-derive clean from receipts.

For every lifecycle action the ledger records:

- transaction hash
- finality and execution status
- pool-touch verification result
- Voyager and Starkscan links
- UTC timestamp

## Completed lifecycle proof

| Action | Mainnet transaction | Result |
|---|---|---|
| Shield STRK | `0x04bee88e5e6e225cd8fd20b7cc6451242d87b6b18334d722555b6414ad908eb0` | Accepted on L2, execution succeeded |
| Forge STRK → Endur xSTRK | `0x06e12ee7283684c905f6138b511a00588b67e64bdc543af1925c393e3dd07333` | Accepted on L2, execution succeeded |
| Unshield STRK | `0x045839af41522f063b3cd5e15a6bb87ceb53655e7150ff0a08258e0c046fc8f9` | Accepted on L2, execution succeeded |
| Reservoir STRK → Vesu vSTRK | `0x06f749fafee519140c48f57d1882b04f3107fb453728d84d57bc0aa63c85acc8` | Accepted on L2, execution succeeded |
| Prism STRK → AVNU output (ETH) | `0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3` | Accepted on L2, execution succeeded |

## Discovery and verification artifacts (2026-09-07)

The caller-identity discovery behind the README hero claim is documented in
[DISCOVERY.md](DISCOVERY.md). The artifacts that back it and every other README
claim are listed with their regeneration commands in
[evidence/claims.json](evidence/claims.json). Highlights: the systematic audit
sweep (`evidence/audit-caller-identity.json`, `evidence/ekubo-probe.json`), the
controlled before/after runs (`evidence/prove-caller-identity-tax-avnu.json`,
`evidence/prove-caller-identity-tax-vesu.json`), the Cairo suite snapshot
(`evidence/snforge-9-of-9.txt`), the receipt re-derivation snapshot
(`evidence/mainnet-verify-5-of-5.txt`), the pool fee measurement
(`evidence/pool-fee.json`), and the settlement-digest demo
(`evidence/settlement-digest-demo.json`).

---

## Receipt re-derivation — full 5-of-5 output

The complete, copy-pasteable output of `node scripts/verify-mainnet.mjs --all`, re-derived from RPC events on mainnet (shield and unshield are pool-touch-only lifecycle transactions, so their five strategy checks print `n/a` — no strategy step ran; Forge, Reservoir, and Prism each clear all six strategy checks). The live snapshot is also kept at [evidence/mainnet-verify-5-of-5.txt](evidence/mainnet-verify-5-of-5.txt).

```text
verifying 5 transaction(s) against pool 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a on SN_MAIN

0x04bee88e5e6e225cd8fd20b7cc6451242d87b6b18334d722555b6414ad908eb0  shield STRK · ACCEPTED_ON_L1 · SUCCEEDED · block 13904581 · sender 0x7d7b2f2febb8f9ce758a267411f2b6b94fa0f661cf4feed490878c8a5b09d94
  ok  STRK20 pool touched
  n/a  no anonymizer invocation (shield/unshield lifecycle transaction, not a strategy step)
  n/a  no protocol allow-list check (no strategy step)
  n/a  no open output note (shield/unshield lifecycle transaction)
  n/a  no zero-residue check (no strategy step)
  n/a  no minimum-output check (no strategy step)

0x06e12ee7283684c905f6138b511a00588b67e64bdc543af1925c393e3dd07333  Forge STRK → Endur xSTRK · ACCEPTED_ON_L1 · SUCCEEDED · block 13904839 · sender 0x32f6254442c50521d1af9b440040f65f3816614b78aa134ae4364bbe02f29ee
  ok  STRK20 pool touched
  ok   Endur deposit anonymizer invoked via privacy_invoke
  ok   Protocol allow-list check passed (Endur deposit anonymizer address matched)
  ok   Output note created with correct token (xSTRK 0x28d709c875…, note 0x401866822d…, 5.953201311259872141 xSTRK)
  ok   Zero residue confirmed (Endur deposit anonymizer balance ends at zero — in 7 STRK = out 7 STRK; approvals reset to zero)
  ok   Minimum output threshold cleared (5.953201311259872141 ≥ 0.000000000000000001)

0x045839af41522f063b3cd5e15a6bb87ceb53655e7150ff0a08258e0c046fc8f9  unshield STRK · ACCEPTED_ON_L1 · SUCCEEDED · block 13906250 · sender 0x32f6254442c50521d1af9b440040f65f3816614b78aa134ae4364bbe02f29ee
  ok  STRK20 pool touched
  n/a  no anonymizer invocation (shield/unshield lifecycle transaction, not a strategy step)
  n/a  no protocol allow-list check (no strategy step)
  n/a  no open output note (shield/unshield lifecycle transaction)
  n/a  no zero-residue check (no strategy step)
  n/a  no minimum-output check (no strategy step)

0x06f749fafee519140c48f57d1882b04f3107fb453728d84d57bc0aa63c85acc8  Reservoir STRK → Vesu vSTRK · ACCEPTED_ON_L1 · SUCCEEDED · block 14038277 · sender 0x1703d22f8415395dfcfa3c810ab333e3198894009c521556c764590622f2a67
  ok  STRK20 pool touched
  ok   MantissaRouter invoked via privacy_invoke
  ok   Protocol allow-list check passed (MantissaRouter V3 (Reservoir) address matched)
  ok   Output note created with correct token (Vesu vSTRK (V2 v-token) 0x6d6d2bf905…, note 0x7fc6cff298…, 1.961851104795617353 Vesu vSTRK (V2 v-token))
  ok   Zero residue confirmed (MantissaRouter V3 (Reservoir) balance ends at zero — in 2 STRK = out 2 STRK; approvals reset to zero)
  ok   Minimum output threshold cleared (1.961851104795617353 ≥ 0.000000000000000001)

0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3  Prism STRK → AVNU output · ACCEPTED_ON_L1 · SUCCEEDED · block 14012996 · sender 0x22391d617f10d3563005c825845b42b218b55b2af2202201db5710ceceb40e7
  ok  STRK20 pool touched
  ok   MantissaRouter invoked via privacy_invoke
  ok   Protocol allow-list check passed (MantissaRouter V2 address matched)
  ok   Output note created with correct token (ETH 0x49d36570d4…, note 0x4aed934f2d…, 0.00002090054271682 ETH)
  ok   Zero residue confirmed (MantissaRouter V2 balance ends at zero — in 2 STRK = out 2 STRK; approvals reset to zero)
  ok   Minimum output threshold cleared (0.00002090054271682 ≥ 0.000000000000000001)

ok   MantissaRouter class hash pinned (on-chain 0x6111c076cbcf20e031a6972c539c9e235f32584d27c32376b45a51187e2db6b matches recorded 0x6111c076cbcf20e031a6972c539c9e235f32584d27c32376b45a51187e2db6b)

5 of 5 lifecycle transactions re-derived from receipts.
ok router class-hash pin against deployment record.
```
