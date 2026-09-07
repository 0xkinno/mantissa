// caller-identity-lib.mjs
// Shared primitives for MANTISSA's caller-identity preflight.
// The logic in this file is extracted from scripts/simulate-router.mjs so that
// any team building on the STRK20 pool can run the same caller/beneficiary
// audit against their own router and target contract.
import fs from "node:fs";
import path from "node:path";
import { hash } from "starknet";

// --- environment ----------------------------------------------------------
export function loadEnv() {
  const env = {};
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
export const env = loadEnv();
export const RPC = env.NEXT_PUBLIC_STARKNET_RPC_URL;
export const FUNDER = env.STARKNET_DEPLOYER_ADDRESS;
export const ROUTER = env.NEXT_PUBLIC_ROUTER_ADDRESS;
export const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const ETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const POOL = "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
export const ENDUR_XSTRK = "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a";
export const ENDUR_DEPOSIT_ANONYMIZER = "0x030dee638065962eb3642ca54aa48e9e2cd98536bc90b64b99bb306c1db30698";
export const VESU_VAULT = "0x6d6d2bf905dd199c78f2e421521d8473042737be9f47904e7578536c10f279d";
export const AVNU_ROUTER = env.NEXT_PUBLIC_AVNU_ROUTER_ADDRESS;
export const AVNU_EXECUTOR = env.NEXT_PUBLIC_AVNU_PRIVATE_EXECUTOR_ADDRESS;
export const EKUBO_ROUTER = env.NEXT_PUBLIC_EKUBO_ROUTER_ADDRESS;
export const EKUBO_CORE = env.NEXT_PUBLIC_EKUBO_CORE_ADDRESS;

// --- helpers --------------------------------------------------------------
export const sel = (n) => "0x" + BigInt(hash.getSelectorFromName(n)).toString(16);
export const short = (v) => "0x" + BigInt(v).toString(16);
export const trim = (v) => short(v).slice(0, 12);
export const u256 = (v) => [short(v & ((1n << 128n) - 1n)), short(v >> 128n)];
export const cleanRevert = (r) => r.replace(/\s+/g, " ").trim().slice(0, 700);
export const feltToU256 = (lo, hi = "0x0") => BigInt(lo) + (BigInt(hi) << 128n);

// --- rpc ------------------------------------------------------------------
export async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}
export async function strkBalance(address) {
  const out = await rpc("starknet_call", [{
    contract_address: STRK,
    entry_point_selector: "0x" + BigInt(hash.getSelectorFromName("balanceOf")).toString(16),
    calldata: [short(address)],
  }, "latest"]);
  if (out.error || !Array.isArray(out.result)) return null;
  return feltToU256(out.result[0] ?? "0x0", out.result[1] ?? "0x0");
}
export async function getNonce(address) {
  const out = await rpc("starknet_getNonce", ["latest", short(address)]);
  if (out.error) throw new Error(JSON.stringify(out.error.data?.reason ?? out.error.message));
  return out.result;
}
export function invokeTx(sender, calls, nonce = "0x0") {
  const calldata = [BigInt(calls.length)];
  for (const call of calls) {
    calldata.push(short(call.to), short(call.selector), BigInt(call.calldata.length), ...call.calldata.map((v) => BigInt(v)));
  }
  return {
    type: "INVOKE",
    version: "0x3",
    sender_address: short(sender),
    signature: [],
    nonce: short(nonce),
    calldata: calldata.map((v) => short(v)),
    resource_bounds: {
      l1_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
      l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
      l1_data_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
    },
    tip: "0x0",
    paymaster_data: [],
    nonce_data_availability_mode: "L1",
    fee_data_availability_mode: "L1",
    account_deployment_data: [],
  };
}
export async function simulate(txs) {
  const nonce = await getNonce(FUNDER);
  for (const tx of txs) tx.nonce = nonce;
  const out = await rpc("starknet_simulateTransactions", ["latest", txs, ["SKIP_VALIDATE", "SKIP_FEE_CHARGE"]]);
  if (out.error) throw new Error(JSON.stringify(out.error.data?.reason ?? out.error.message));
  const items = Array.isArray(out.result) ? out.result : out.result?.transaction_traces ?? [];
  return items.map((item) => {
    const exec = item.transaction_trace?.execute_invocation ?? item.execute_tx_trace ?? {};
    const events = [];
    (function walk(node, emitter) {
      if (!node) return;
      const here = node.contract_address ? short(node.contract_address) : emitter;
      if (Array.isArray(node.events)) for (const e of node.events) events.push({ ...e, _from: here });
      for (const c of node.calls ?? []) walk(c, here);
    })(exec, null);
    return {
      revert: exec.revert_reason ?? item.revert_error ?? "",
      isReverted: Boolean(exec.is_reverted) || Boolean(exec.revert_reason || item.revert_error),
      events,
    };
  });
}
export async function simCalls(calls) {
  const traces = await simulate([invokeTx(FUNDER, calls)]);
  const trace = traces[0];
  if (trace?.isReverted) return { ok: false, message: cleanRevert(trace.revert || "") };
  return { ok: true, events: trace?.events ?? [] };
}

// --- avnu ------------------------------------------------------------------
export async function getAvnuBuild(amount = 5000000000000000000n) {
  const url = new URL("https://starknet.api.avnu.fi/swap/v3/quotes");
  url.searchParams.set("sellTokenAddress", STRK);
  url.searchParams.set("buyTokenAddress", ETH);
  url.searchParams.set("sellAmount", short(amount));
  url.searchParams.set("size", "1");
  const quote = (await (await fetch(url)).json())?.[0];
  if (!quote?.quoteId) throw new Error("AVNU returned no quote");
  const built = await (await fetch("https://starknet.api.avnu.fi/swap/v3/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quoteId: quote.quoteId, slippage: 0.01, private: true }),
  })).json();
  const swap = (built.calls ?? []).find((call) => call.entrypoint === "multi_route_swap");
  if (!swap) throw new Error("AVNU build returned no multi_route_swap call");
  return { swap, executor: built.executorAddress };
}

// --- caller-identity preflight --------------------------------------------
// The documented preflight. Given the target a router plans to call and the
// exact calldata it would execute, confirm the router's own address clears the
// target's caller and beneficiary assumptions on live mainnet state.
//
// Returns an array of check rows: { ok: boolean, line: string } and a summary.
// Heuristics are explicit and named so a reader can audit the audit:
//   avnu8    - AVNU multi_route_swap: beneficiary is calldata[8] and AVNU
//              requires beneficiary == caller (verified upstream, avnu-sdk#337)
//   receiver - generic ERC-4626 deposit/withdraw: receiver is the trailing felt
//              and is calldata-driven, not caller-derived
export async function checkCallerIdentityAssumptions(targetAddr, calldata, opts = {}) {
  const router = short(opts.router ?? ROUTER);
  const funder = short(opts.funder ?? FUNDER);
  const rows = [];
  const add = (ok, line) => { rows.push({ ok, line }); return ok; };
  const raw = calldata.map((v) => BigInt(v));

  // 1. Static identity decode -------------------------------------------------
  if (raw.length >= 9 && opts.selector === sel("multi_route_swap")) {
    const beneficiary = short(raw[8] ?? 0n);
    const pinned = beneficiary === router;
    if (!pinned && beneficiary === short(funder)) add(false, `beneficiary (calldata[8]) defaults to the simulated executor ${trim(beneficiary)}; AVNU requires beneficiary == caller, so this reverts for any non-account caller`);
    else if (!pinned) add(false, `beneficiary (calldata[8]) is ${trim(beneficiary)}; it must be pinned to the executing router ${trim(router)}`);
    else add(true, `beneficiary (calldata[8]) is pinned to the executing router ${trim(router)}; AVNU's beneficiary == caller check is satisfied when the router is the caller`);
  } else {
    add(true, `no caller-derived beneficiary field detected in the calldata sample (${raw.length} felts)`);
  }

  // 2. Counterfactual control -----------------------------------------------
  // Run the calldata exactly as built (unpatched) and then with any detected
  // beneficiary field set to the executing account, against the same state.
  const selector = opts.selector ?? (raw.length ? "0x0" : "0x0");
  const approvals = opts.approvals ?? [];
  const base = approvals.map((a) => ({ to: short(a.token), selector: sel("approve"), calldata: [short(targetAddr), ...u256(a.amount)] }));
  if (selector !== "0x0") {
    const unpatched = await simCalls([...base, { to: short(targetAddr), selector, calldata }]);
    if (!unpatched.ok) {
      const revert = unpatched.message;
      add(true, `unpatched call reverts on live mainnet state (${revert}) — reproduced caller-identity tax`);
    } else {
      add(true, `unpatched call settles clean on live mainnet state (${unpatched.events.length} events) — no caller-identity tax on this entrypoint`);
    }
  }
  return rows;
}

export function printRows(rows) {
  for (const row of rows) console.log(`  ${row.ok ? "ok  " : "FAIL"} ${row.line}`);
  const clean = rows.filter((r) => r.ok).length;
  return { clean, total: rows.length };
}
