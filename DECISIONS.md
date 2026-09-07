# MANTISSA — Engineering Decisions Log

Recorded engineering decisions behind the MantissaRouter execution path. Each entry
states the decision, why it was made, what was rejected, and where the evidence lives.
This is the decision trail behind the [Limitations](README.md#limitations) section of
the README and the verification trail in [DOCUMENTATION.md](DOCUMENTATION.md).

## D-001 — MantissaRouter V2 → V3 (allow-list change requires a redeploy)

**Decision.** Deploy a new router instance (MantissaRouter V3,
`0x74fc6126...b7f460bc`, deploy tx `0x16a3593f...8112c05dd`, same class
`0x6111c076...2db6b`) instead of modifying the deployed router's allow-list.

**Why.** MantissaRouter is immutable: the constructor pins the pool, the protocol
allow-list, and the output-token allow-list once. There is no governance or update
function, by design, so the only way to add a protocol target is a fresh deployment
with the same class. Changing Reservoir's target (see D-002) therefore forced a
redeploy; the class is unchanged, so the invariant enforcement is byte-identical
across V2 and V3.

**Rejected.** A mutable allow-list or a governance upgrade path. That would have
avoided the redeploy but weakens invariant I7 (protocol allow-list) and the
no-reentrancy/immutability story the router advertises.

**Evidence.** `router-deployment.json` (class hash, deploy tx, both allow-lists),
[Deployed Contracts](README.md#deployed-contracts), `scripts/verify-mainnet.mjs`
(allow-list membership is re-derived against the deployed router).

## D-002 — Vesu v-token swap after `'not-allowed'`

**Decision.** Target the Vesu V2 vSTRK v-token (`0x6d6d2bf9...`, public ERC-4626
`deposit(assets, receiver)`) instead of the originally allow-listed Vesu V2.1
receipt (`0x037ae3...`).

**Why.** Simulating the exact router step against live mainnet state showed the
original target's `deposit()` reverts `'not-allowed'` unless the caller is its own
pool extension. MantissaRouter cannot impersonate that extension, so the original
recipe could never settle. The V2 vSTRK v-token is the same ERC-4626 shape as the
receipt-proven Forge path: `deposit()` pulls STRK from the caller (the router) and
mints vSTRK to the receiver (the router). The router therefore receives the output
it deposits as the private note, exactly like Forge.

**Rejected.** A pool-targeted `modify_position` recipe with the Vesu pool
allow-listed. It would have worked in principle but requires encoding Vesu's
structured position payload in the router plan and widens the allow-list to a pool
contract, increasing the surface area for no benefit over the public v-token entry.

**Evidence.** [Limitations](README.md#limitations) ("Reservoir required a Vesu V2
v-token swap"), `scripts/simulate-router.mjs` pre-flight (mint of `9.809... vSTRK`
for `10 STRK` to MantissaRouter), `router-deployment.json`.

## D-003 — AVNU beneficiary pinned to MantissaRouter

**Decision.** Pin the `multi_route_swap` beneficiary to MantissaRouter in the Prism
recipe (calldata[8]) instead of trusting AVNU's build default.

**Why.** AVNU's `multi_route_swap` enforces `beneficiary == caller`. The AVNU private
build defaults the beneficiary to its private executor, which reverts
`'Beneficiary is not the caller'` for any other caller. Because MantissaRouter is the
caller, the only beneficiary that satisfies AVNU's check is MantissaRouter itself.
The pin is what let Prism settle on mainnet (block 14012996).

**Rejected.** Leaving the build default in place. The unpatched build was verified to
fail AVNU's own `beneficiary == caller` check in pre-flight, so shipping it would have
made Prism permanently reverting.

**Evidence.** [Limitations](README.md#limitations) ("Prism requires a beneficiary
pin"), `scripts/simulate-router.mjs` Prism pre-flight (beneficiary invariant
satisfied), Prism mainnet receipt `0x78815ce9...e0aa6b3`.

## D-004 — Caller-identity preflight is a mandatory gate before any new strategy is wired in

**Decision.** Every integration point must clear a caller-identity preflight against
live mainnet state before it is marked live, and the preflight is shipped as public
CLI infrastructure (`scripts/check-caller-identity.mjs`) rather than a MANTISSA-internal
check.

**Why.** Two receipt-proven strategies (Prism and Reservoir) each failed silently at
the target protocol's caller assumptions before the fix: AVNU's `multi_route_swap`
defaults the beneficiary to its own executor and enforces `beneficiary == caller`; the
legacy Vesu V2.1 v-token restricted `deposit()` to its own pool extension. A stateless
router holds no keys, so it is never the entity those protocols assumed would call
them. The systematic audit (`scripts/audit-caller-identity.mjs`) sweeps Endur, Vesu V2
and V2.1, AVNU, and the Ekubo router/core contracts. Ekubo did not reproduce the tax:
its swap entrypoints carry no caller-derived beneficiary, settlement is locker-centric
(proceeds settle to the Ekubo Router contract), and `Core.swap` is lock-scoped with an
explicit locker-supplied recipient.

**Rejected.** Trusting that a public-looking ERC-4626 interface means an external
router can call it, or that a route that settles for an account will settle for a
router. Both assumptions failed in production.

**Evidence.** [DISCOVERY.md](DISCOVERY.md), `evidence/audit-caller-identity.json`,
`evidence/ekubo-probe.json`, `evidence/prove-caller-identity-tax-{avnu,vesu}.json`.

## D-005 — Signed settlement digest as a second disclosure mode

**Decision.** Beside the viewing-key flow, offer a signed, short-lived settlement
digest: `poseidon(domain, strategy, amount, router, outputToken, txHash, expiry)`
signed by the wallet, verifiable without any shielded state.

**Why.** A counterparty sometimes needs to confirm one action happened and reached
finality — not audit an entire history. A digest binds the specific execution and
its receipt facts; the verifier never touches a viewing key or another note.

**Rejected.** Requiring a viewing-key export for every disclosure, which over-exposes
the position whenever only one action needs proving.

**Evidence.** `scripts/settlement-digest.mjs`, `evidence/settlement-digest-demo.json`,
`src/app/compliance/page.tsx` (Settlement Proof card, honest wallet-signing status).

## How decisions are recorded

- Decisions are logged when they change what a strategy executes or how the router
  is deployed; routine implementation detail is not logged.
- Dates and verification commands live in [DOCUMENTATION.md](DOCUMENTATION.md); the
  on-chain evidence lives in `strk20.json` and `router-deployment.json`.
- If a decision is later shown to be wrong, it gets a new entry here rather than an
  edit to an old one.