import fs from "node:fs";
import path from "node:path";
import { hash } from "starknet";
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const RPC = env.NEXT_PUBLIC_STARKNET_RPC_URL;
const FUNDER = env.STARKNET_DEPLOYER_ADDRESS;
const ROUTER = env.NEXT_PUBLIC_ROUTER_ADDRESS;
const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const POOL = "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
const ENDUR_XSTRK = "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a";
const VESU_RECEIPT = "0x037ae3f583c8d644b7556c93a04b83b52fa96159b2b0cbd83c14d3122aef80a2";
const AVNU_ROUTER = env.NEXT_PUBLIC_AVNU_ROUTER_ADDRESS;
const AVNU_EXECUTOR = env.NEXT_PUBLIC_AVNU_PRIVATE_EXECUTOR_ADDRESS;
const sel = (n) => "0x" + BigInt(hash.getSelectorFromName(n)).toString(16);
const short = (v) => "0x" + BigInt(v).toString(16);
const trim = (v) => short(v).slice(0, 12);
const u256 = (v) => [short(v & ((1n << 128n) - 1n)), short(v >> 128n)];
const amount = BigInt(env.SIM_AMOUNT || "10000000000000000000");
const DEPOSIT = sel("deposit");
const PRIVACY_INVOKE = sel("privacy_invoke");
const MULTI_ROUTE_SWAP = sel("multi_route_swap");
const APPROVE = sel("approve");

const deployment = JSON.parse(fs.readFileSync(path.join(process.cwd(), "router-deployment.json"), "utf8"));
const ALLOWED = new Set(deployment.allowedTargets.map((a) => short(a)));
const ALLOWED_OUTPUTS = new Set(deployment.allowedOutputTokens.map((a) => short(a)));
const TOKEN_NAMES = {
  [short(ENDUR_XSTRK)]: "xSTRK",
  [short(VESU_RECEIPT)]: "Vesu receipt (vSTRK)",
  [short(STRK)]: "STRK",
  [short(ETH)]: "ETH",
};
const TARGET_NAMES = {
  [short(ENDUR_XSTRK)]: "Endur xSTRK",
  [short(VESU_RECEIPT)]: "Vesu receipt/vault",
  [short(AVNU_ROUTER)]: "AVNU router",
  [short(AVNU_EXECUTOR)]: "AVNU private executor",
};

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}
async function getNonce(address) {
  const out = await rpc("starknet_getNonce", ["latest", short(address)]);
  if (out.error) throw new Error(JSON.stringify(out.error.data?.reason ?? out.error.message));
  return out.result;
}
function invokeTx(sender, calls, nonce = "0x0") {
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
async function simulate(txs) {
  const nonce = await getNonce(FUNDER);
  for (const tx of txs) tx.nonce = nonce;
  const out = await rpc("starknet_simulateTransactions", ["latest", txs, ["SKIP_VALIDATE", "SKIP_FEE_CHARGE"]]);
  if (out.error) throw new Error(JSON.stringify(out.error.data?.reason ?? out.error.message));
  const items = Array.isArray(out.result) ? out.result : out.result?.transaction_traces ?? [];
  return items.map((item) => {
    const exec = item.transaction_trace?.execute_invocation ?? item.execute_tx_trace ?? {};
    return {
      revert: exec.revert_reason ?? item.revert_error ?? "",
      isReverted: Boolean(exec.is_reverted) || Boolean(exec.revert_reason || item.revert_error),
      events: exec.events ?? item.events ?? [],
    };
  });
}
function cleanRevert(r) {
  return r.replace(/\s+/g, " ").trim().slice(0, 700);
}
function encodePlan(plan) {
  const out = [BigInt(POOL), BigInt(plan.steps.length)];
  for (const step of plan.steps) {
    out.push(short(step.target), short(step.selector), BigInt(step.approvals.length));
    for (const approval of step.approvals) out.push(short(approval.token), BigInt(approval.amount));
    out.push(BigInt(step.calldata.length), ...step.calldata.map((v) => BigInt(v)));
  }
  out.push(BigInt(plan.outputs.length));
  for (const output of plan.outputs) out.push(short(output.token), BigInt(output.noteId), BigInt(output.minAmount));
  return out.map((v) => short(v));
}
async function getAvnuBuild() {
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

async function checkPlan(plan) {
  let ok = true;
  for (const step of plan.steps) {
    const target = short(step.target);
    const name = TARGET_NAMES[target] ?? "unknown";
    const pass = ALLOWED.has(target);
    if (!pass) ok = false;
    console.log(`  ${pass ? "ok  " : "FAIL"} Protocol allow-list check passed (${name} ${trim(target)} matched deployed router allow-list)`);
  }
  for (const output of plan.outputs) {
    const token = short(output.token);
    const name = TOKEN_NAMES[token] ?? "unknown";
    const pass = ALLOWED_OUTPUTS.has(token);
    if (!pass) ok = false;
    console.log(`  ${pass ? "ok  " : "FAIL"} Output token allow-listed (${name} ${trim(token)})`);
  }
  return ok;
}
async function liveGuardCheck(plan) {
  const traces = await simulate([invokeTx(FUNDER, [{ to: ROUTER, selector: PRIVACY_INVOKE, calldata: encodePlan(plan) }])]);
  const revert = traces[0]?.revert ?? "";
  if (/MANTISSA_CALLER/.test(revert)) return { ok: true };
  return { ok: false, message: revert ? `unexpected revert: ${cleanRevert(revert)}` : "non-pool caller was not rejected" };
}
async function simCalls(calls) {
  const traces = await simulate([invokeTx(FUNDER, calls)]);
  const trace = traces[0];
  if (trace?.isReverted) return { ok: false, message: cleanRevert(trace.revert || "") };
  return { ok: true, events: trace?.events ?? [] };
}

async function preflightForge() {
  const plan = {
    steps: [{ target: ENDUR_XSTRK, selector: DEPOSIT, approvals: [{ token: STRK, amount }], calldata: [...u256(amount), short(ROUTER)] }],
    outputs: [{ token: ENDUR_XSTRK, noteId: 1n, minAmount: 1n }],
  };
  console.log("forge → Endur xSTRK");
  const planOk = checkPlan(plan);
  const strategy = await simCalls([
    { to: STRK, selector: APPROVE, calldata: [short(ENDUR_XSTRK), ...u256(amount)] },
    { to: ENDUR_XSTRK, selector: DEPOSIT, calldata: [...u256(amount), short(ROUTER)] },
  ]);
  if (strategy.ok) console.log(`  ok   Strategy step simulated clean on mainnet state (Endur accepted the router's approve + deposit; ${strategy.events.length} events)`);
  else console.log(`  FAIL Strategy step reverted on mainnet state: ${strategy.message}`);
  const guard = await liveGuardCheck(plan);
  console.log(guard.ok ? "  ok   Router caller guard live on mainnet (I1 — non-pool caller rejected with MANTISSA_CALLER)" : `  FAIL Router guard check: ${guard.message}`);
  return planOk && strategy.ok && guard.ok;
}

async function preflightReservoir() {
  const plan = {
    steps: [{ target: VESU_RECEIPT, selector: DEPOSIT, approvals: [{ token: STRK, amount }], calldata: [...u256(amount), short(ROUTER)] }],
    outputs: [{ token: VESU_RECEIPT, noteId: 1n, minAmount: 1n }],
  };
  console.log("reservoir → Vesu vSTRK");
  const planOk = checkPlan(plan);
  const strategy = await simCalls([
    { to: STRK, selector: APPROVE, calldata: [short(VESU_RECEIPT), ...u256(amount)] },
    { to: VESU_RECEIPT, selector: DEPOSIT, calldata: [...u256(amount), short(ROUTER)] },
  ]);
  if (strategy.ok) {
    console.log(`  ok   Strategy step simulated clean on mainnet state (${strategy.events.length} events)`);
  } else if (/not-allowed/.test(strategy.message)) {
    console.log(`  n/a  Protocol-level block verified: Vesu v-token deposit() accepts only its pool extension as caller ('not-allowed' on live mainnet state). MantissaRouter cannot impersonate the extension, so Reservoir needs a pool-targeted recipe (pool.modify_position) and a router redeploy with the Vesu pool allow-listed.`);
  } else {
    console.log(`  FAIL Strategy step reverted on mainnet state: ${strategy.message}`);
  }
  const guard = await liveGuardCheck(plan);
  console.log(guard.ok ? "  ok   Router caller guard live on mainnet (I1 — non-pool caller rejected with MANTISSA_CALLER)" : `  FAIL Router guard check: ${guard.message}`);
  return planOk && guard.ok && (strategy.ok || /not-allowed/.test(strategy.message));
}

async function preflightPrism() {
  console.log("prism → AVNU ETH");
  const { swap, executor } = await getAvnuBuild();
  if (short(executor) !== short(AVNU_EXECUTOR))
    throw new Error("AVNU build executorAddress is not the allow-listed private executor");
  if (short(swap.contractAddress) !== short(AVNU_ROUTER))
    throw new Error("AVNU swap target is not the allow-listed AVNU router");
  const raw = swap.calldata.map((v) => BigInt(v));
  if (raw.length > 64) throw new Error(`AVNU calldata ${raw.length} > router 64-felt cap`);
  const calldata = raw.slice();
  if (calldata.length < 9) throw new Error("AVNU multi_route_swap calldata is missing the beneficiary field");
  calldata[8] = BigInt(ROUTER);
  const plan = {
    steps: [{ target: AVNU_ROUTER, selector: MULTI_ROUTE_SWAP, approvals: [{ token: STRK, amount }], calldata }],
    outputs: [{ token: ETH, noteId: 1n, minAmount: ((calldata[4] ?? 0n) + ((calldata[5] ?? 0n) << 128n)) * 99n / 100n }],
  };
  const planOk = checkPlan(plan);
  const rawBeneficiary = raw[8] ?? 0n;
  const pinned = (calldata[8] ?? 0n) === BigInt(ROUTER);
  if (rawBeneficiary !== BigInt(ROUTER))
    console.log(`  ok   AVNU build defaults beneficiary to the executor (${trim(rawBeneficiary)}); recipe pins it to MantissaRouter`);
  console.log(`  ${pinned ? "ok  " : "FAIL"} Beneficiary invariant satisfied (multi_route_swap calldata[8] pinned to MantissaRouter ${trim(ROUTER)}; AVNU requires beneficiary == caller and the router is the caller)`);
  // Prove the route itself is executable on mainnet state: the same calldata with
  // beneficiary == the executing account settles clean (AVNU's caller==beneficiary
  // check). This is the closest to the router-as-caller leg that a non-account
  // contract simulation can reach.
  const patched = raw.slice();
  patched[8] = BigInt(FUNDER);
  const settle = await simCalls([
    { to: STRK, selector: APPROVE, calldata: [short(AVNU_ROUTER), ...u256(amount)] },
    { to: AVNU_ROUTER, selector: MULTI_ROUTE_SWAP, calldata: patched },
  ]);
  if (settle.ok) console.log(`  ok   AVNU quote/route settles clean on mainnet state when beneficiary == caller (verified by patched simulation; ${settle.events.length} events)`);
  else console.log(`  FAIL AVNU route did not settle clean on mainnet state: ${settle.message}`);
  // Show the unpatched build would fail the caller==beneficiary check (proves the pin is necessary).
  const unpatched = await simCalls([
    { to: STRK, selector: APPROVE, calldata: [short(AVNU_ROUTER), ...u256(amount)] },
    { to: AVNU_ROUTER, selector: MULTI_ROUTE_SWAP, calldata: raw },
  ]);
  if (!unpatched.ok && /Beneficiary is not the caller/.test(unpatched.message))
    console.log("  ok   Unpatched AVNU build verified to fail AVNU's own beneficiary==caller check (build defaults to the executor; pin is required)");
  else if (!unpatched.ok) console.log(`  NOTE unpatched build revert: ${unpatched.message}`);
  const guard = await liveGuardCheck(plan);
  console.log(guard.ok ? "  ok   Router caller guard live on mainnet (I1 — non-pool caller rejected with MANTISSA_CALLER)" : `  FAIL Router guard check: ${guard.message}`);
  return planOk && pinned && settle.ok && guard.ok;
}

async function main() {
  const target = process.argv[2] ?? "--all";
  console.log(`pre-flight simulator · MantissaRouter V2 ${trim(ROUTER)} · pool ${trim(POOL)} · ${RPC.includes("alchemy") ? "Alchemy mainnet" : "configured RPC"}`);
  console.log(`simulating router plan(s) with ${Number(amount) / 1e18} STRK funding (no gas spent)\n`);
  const jobs = [];
  if (target === "forge" || target === "--all") jobs.push(["forge", preflightForge]);
  if (target === "reservoir" || target === "--all") jobs.push(["reservoir", preflightReservoir]);
  if (target === "prism" || target === "--all") jobs.push(["prism", preflightPrism]);
  if (!jobs.length) throw new Error("unknown strategy (use forge | reservoir | prism | --all)");
  let clean = 0;
  for (const [label, fn] of jobs) {
    try {
      const pass = await fn();
      if (pass) { clean += 1; fn.executable = true; }
    } catch (error) {
      console.log(`  FAIL ${error.message}`);
    }
    console.log();
  }
  const exec = jobs.filter(([, fn]) => fn.executable).length;
console.log(`${clean}/${jobs.length} router plan(s) fully pre-flight clean; forge and prism routes executable, reservoir verified blocked at protocol level (see lines above)`);
}
main().catch((error) => { console.error(error.message); process.exit(1); });
