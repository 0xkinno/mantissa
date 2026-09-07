# DISCOVERY — The Caller-Identity Tax

*A finding MANTISSA reproduced twice on Starknet mainnet, filed once upstream, and turned into a reusable preflight check. This document is the discovery record behind the README's hero claim.*

---

## SPONSOR PRIMITIVE

STRK20 grants a shielded position exactly one way to move value into an external
contract: a single `privacy_invoke` per transaction, executed with the pool as the
caller. Two consequences follow from that design and cannot be negotiated away:

1. **One invoke.** A strategy that needs `approve` then `deposit` then `withdraw`
   must compress all of it into one call chain, or it cannot run inside the pool.
2. **Zero residue.** The pool requires every token the router touches to end at a
   zero balance. A router that receives a fee, a rebate, or a leftover dust amount
   fails the execution.

The sponsor primitive therefore demands a *stateless executor*: an address that
acts on behalf of the pool, holds nothing before or after, and is not an account
with keys, a history, or an economic interest in the call it relays.

## OBSERVED CONSTRAINT

DeFi protocols on Starknet silently assume their caller is a privileged,
persistent, or self-interested account. The assumptions take three shapes:

- *Privileged* — the contract restricts an entrypoint to its own extensions or
  registered modules and reverts for everyone else (`'not-allowed'`), even when the
  interface is shaped like a public ERC-4626 vault.
- *Persistent* — the contract expects a caller that holds balances, positions, or
  approvals across transactions, so it can recover state later.
- *Self-interested* — the contract pays, refunds, or routes value to the caller
  (`beneficiary`) on the assumption that the caller wants the proceeds and controls
  the keys to claim them.

A stateless STRK20 router is none of those three things. It is the pool's hand, not
an account. When a protocol's calldata encodes one of those assumptions, the call
fails with a revert that names the protocol's internal check — `'Beneficiary is not
the caller'`, `'not-allowed'` — never the actual mismatch: *the router is not the
entity the protocol assumed would call it.*

## EVIDENCE

Two independent, live-mainnet reproductions. Both are controlled before/after
comparisons — same state, same calldata, one variable changed — recorded in
`evidence/` and regenerable with `scripts/prove-caller-identity-tax.mjs`.

1. **AVNU `multi_route_swap` (Prism).** AVNU's private swap build defaults the
   `beneficiary` field of `multi_route_swap` calldata to the transaction's own
   executor. Executing that unpatched calldata from a router reverts
   `"Beneficiary is not the caller"` — AVNU requires `beneficiary == caller`, and
   the router *is* the caller, so the pin is mandatory, not optional. Filed upstream
   as [avnu-sdk#337](https://github.com/avnu-labs/avnu-sdk/issues/337).
   Reproduced side by side in `evidence/prove-caller-identity-tax-avnu.json`.
2. **Vesu v-token `deposit()` (Reservoir).** The Vesu V2.1 vSTRK v-token restricts
   `deposit()` to its own pool extension. An external router — even one that holds
   an allowance and follows the public ERC-4626 shape — reverts `'not-allowed'`.
   The fix was not a router patch but a *target change*: the V2 vSTRK v-token
   (an unrestricted ERC-4626 deposit) is the allow-listed output, and Reservoir is
   receipt-confirmed on mainnet against it. Reproduced side by side in
   `evidence/prove-caller-identity-tax-vesu.json`.

3. **Ekubo (systematic sweep; not yet a live strategy).** The Ekubo Router's swap
   entrypoints (`swap`, `multihop_swap`, `multi_multihop_swap`) carry no caller-derived
   beneficiary field, and its `Core.swap` takes an explicit, locker-supplied `recipient`
   parameter. Settlement is locker-centric: proceeds settle to the Ekubo Router contract
   itself, and `Core.swap` only executes inside the active lock. No third caller-identity
   tax was reproduced — a structural difference, recorded as a clean sweep row in
   `evidence/audit-caller-identity.json` and `evidence/ekubo-probe.json`.

## WHY A GENERIC ROUTER OR A BALANCE PROOF DOES NOT SOLVE IT

Two other layers of this problem already have strong solutions, and neither
reaches the caller-identity mismatch:

- **Router-level invariants.** A plan-based router that accepts free-form calldata
  and enforces a strong *self*-invariant suite (caller guard, no reentrancy,
  approval reset, zero residue, bounded calldata, allow-list) answers *"can my
  router be abused?"* — not *"does the target protocol accept my router as a
  caller?"* A generic router and a protocol-safety layer are different problems.
  The pattern of exposing a public audit endpoint that checks any repository's
  evidence ledger is the model MANTISSA adopts for exposing its preflight publicly.
- **Balance-level proofs.** A capital-mobilization gate proves *control* of a
  balance by moving it atomically. That answers *"does this position exist and can
  it be moved?"* — not *"will the destination protocol execute the move for an
  anonymous caller?"* The discipline of tying every public claim to a regeneration
  command is the model MANTISSA adopts for its evidence ledger.

Neither router-level invariants nor balance-level proofs can detect a
caller-identity mismatch, because the mismatch lives in the *target protocol's*
assumptions, not in the router and not in the pool. A router can be flawless and
still revert on a protocol that never expected an anonymous executor.
## NEW CAPABILITY

Any router builder on this pool — not just MANTISSA — can pre-flight a target DeFi
contract for caller-identity assumptions *before* wiring it into a strategy,
catching a silent revert before a user signs anything.

Concretely, MANTISSA ships `checkCallerIdentityAssumptions(targetAddr, calldata)`
in `scripts/caller-identity-lib.mjs` and a public CLI,
`scripts/check-caller-identity.mjs`, that takes any target address and a calldata
sample and reports:

- whether the target's own documented interface assumes a privileged caller,
- whether a `beneficiary`/`receiver` field resolves to the executing account rather
  than the router, and must be pinned,
- whether the exact step the router will execute settles clean against live mainnet
  state with the router as caller,
- the controlled counterfactual (unpatched vs patched) where a mismatch exists.

A second team can run it against *their* router and *their* target contract without
touching MANTISSA's app or contracts. The caller-identity tax is not a MANTISSA bug
list; it is public infrastructure.

## INVARIANT

> A strategy step must never execute against live mainnet state without first
> confirming the router's own address clears the target protocol's caller and
> beneficiary checks.

This invariant is enforced in tooling, not in prose: every router plan in
`scripts/simulate-router.mjs` runs the caller-identity check against the exact
calldata the router would execute before the plan is reported clean, and the
four-way audit in `scripts/audit-caller-identity.mjs` re-checks every integration
(Endur, Vesu, AVNU, Ekubo) on live mainnet state.

## FAILURE MODE

Both failure modes are reproduced, not imagined:

- AVNU: `multi_route_swap` built with `beneficiary = executor` reverts
  `"Beneficiary is not the caller"` when executed from a router.
- Vesu: V2.1 vSTRK v-token `deposit()` reverts `'not-allowed'` for an external
  router that holds a valid allowance.

The identical call with the single corrected field (beneficiary pinned to the
router; v-token swapped to the unrestricted V2 receipt) settles clean on the same
mainnet state. Everything else about the call is unchanged, which is what makes the
comparison a counterfactual control and not an anecdote.

## DEMONSTRATION

The controlled before/after comparison is a script, not a narrative:
`scripts/prove-caller-identity-tax.mjs` runs the unpatched and patched builds
against the same live mainnet state, back to back, and writes both outcomes to
`evidence/`. Raw output is preserved in `evidence/prove-caller-identity-tax.txt`
and structured JSON per case. Reproduce with:

```bash
node scripts/prove-caller-identity-tax.mjs
```

---

## Step 6 design note — Settlement Proof (signed settlement digest)

*Status: design + verifier implemented; live production digests require a
connected privacy wallet to sign. Not claimed as shipped end to end.*

**Pattern source:** reward-settlement designs prove a private transfer was
authorized and happened — without an on-chain escrow contract — by binding a signed,
short-lived authorization to a transaction hash and verifying signature validity,
chain finality, and direct pool interaction.

**MANTISSA design:** a second disclosure mode beside the viewing-key flow. A user
(or MANTISSA itself, for a strategy execution) produces a signed digest binding:

- strategy name and amount,
- the MantissaRouter address that executed,
- the output note's token,
- the transaction hash.

The digest is a typed-data payload over
`poseidon(strategy, amount, router, outputToken, txHash, expiry)`. Anyone holding it
can verify, without ever seeing the shielded balance or any other note: (1) this
signer authorized this specific action, (2) the transaction touched the STRK20
pool, (3) it reached finality. Narrower and cheaper than a viewing key, and the
right tool when a counterparty needs to confirm one action happened — not audit an
entire history.

**What is real today:** the digest schema and an offline signature verifier
(`scripts/settlement-digest.mjs`, Stark curve verification) plus the /compliance
presentation of the mode. **What awaits a connected wallet:** producing a
production digest from the user's own signing session. If a judge wants to see a
live digest, connect a privacy-enabled wallet on the deployed site.

## Step 11/12 design note — live per-action disclosure

*Status: implemented (2026-09-07). The /private confirm flow measures the band
live before a shield, strategy, or unshield is signed; the decode and band logic
is unit-tested offline against real mainnet event fixtures.*

Pattern source: trade panels that compute disclosure for an action from the
market's own state at signing time and say plainly when an action would be
identifiable by amount alone.

The /private flow queries the STRK20 pool's own Deposit and Withdrawal events
for the token over a recent block window and counts how many fall in the same
rough size band as the amount about to move (`src/lib/poolTraffic.ts`). The
decoder only accepts the event shapes observed on mainnet receipts — token in
keys[2], Deposit amount in data[0], Withdrawal amount in the final data felt —
and skips anything else rather than guessing. The UI (`BandDisclosure`) prints
the count; when the band is empty it says the action would be identifiable by
its amount alone, and when a query is truncated it says “at least N”. If the
RPC is not configured the UI says the disclosure is unavailable instead of
faking a number. The measured lines sit beside the exact statement of the
boundary in README's “What This Actually Proves” section.
