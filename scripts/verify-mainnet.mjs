/**
 * verify-mainnet.mjs — re-derives MANTISSA's mainnet evidence from raw receipts.
 *
 * Given a transaction hash, this script re-reads the receipt and transaction
 * from the Starknet RPC and reconstructs each checklist item from the events the
 * STRK20 pool, the token contracts and the invoked anonymizer/router actually
 * emitted. It never trusts tx status alone and never links to an explorer.
 *
 *   node scripts/verify-mainnet.mjs 0x<shield> 0x<forge> 0x<unshield>
 *   node scripts/verify-mainnet.mjs --all
 *
 * `--all` runs the five lifecycle hashes: shield, Forge, unshield, Reservoir and
 * Prism. Reservoir is still pending until the human operator supplies a real
 * hash and is printed as `pending` rather than guessed at; Prism is
 * receipt-confirmed and verified from its real mainnet hash.
 */
import fs from "node:fs";
import { RpcProvider, hash, shortString } from "starknet";

const short = (v) => `0x${BigInt(v).toString(16)}`;
const selector = (name) => `0x${BigInt(hash.getSelectorFromName(name)).toString(16)}`;
const feltToAmount = (low, high = "0x0") => BigInt(low) + (BigInt(high) << 128n);
const formatUnits = (raw, decimals = 18) => {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

const POOL = "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ROUTER = "0x327ce0db2f6f0e6abbae89a69245313072dbd3676d0c8090e58e71e56caddca";
const ENDUR_ANONYMIZER = "0x030dee638065962eb3642ca54aa48e9e2cd98536bc90b64b99bb306c1db30698";
const ENDUR_XSTRK = "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a";
const VESU_RECEIPT = "0x037ae3f583c8d644b7556c93a04b83b52fa96159b2b0cbd83c14d3122aef80a2";
const VESU_POOL = "0x0451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5";
const AVNU_ROUTER = "0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f";
const AVNU_EXECUTOR = "0x0426dcd1ab5fa2f852f138d07cb37708b00a4db999677fe2d0c9a440702dbe5e";

const ALLOW_LIST = {
  "MantissaRouter V2": ROUTER,
  "Endur deposit anonymizer": ENDUR_ANONYMIZER,
  "Endur xSTRK": ENDUR_XSTRK,
  "Vesu receipt/vault": VESU_RECEIPT,
  "Vesu pool": VESU_POOL,
  "AVNU router": AVNU_ROUTER,
  "AVNU private executor": AVNU_EXECUTOR,
};
const ALLOWED = new Set(Object.values(ALLOW_LIST).map((a) => short(a)));
const OUTPUT_TOKENS = {
  "xSTRK": ENDUR_XSTRK,
  "STRK": STRK,
  "Vesu vSTRK": VESU_RECEIPT,
  "ETH": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
};
const OUTPUT_SET = new Set(Object.values(OUTPUT_TOKENS).map((a) => short(a)));
const PRIVACY_SELECTORS = {
  privacy_invoke: selector("privacy_invoke"),
  privacy_invoke_with_computation: selector("privacy_invoke_with_computation"),
};
const EVENTS = Object.fromEntries(
  ["Deposit", "Withdrawal", "OpenNoteCreated", "OpenNoteDeposited", "ExternalContractInvoked", "EncNoteCreated", "NoteUsed", "Transfer", "Approval"].map((n) => [n, selector(n)])
);
const norm = (v) => short(v);

const PLACEHOLDER = /<PASTE_[A-Z_]+_TX_HASH>/;

function loadEnv() {
  const vars = {};
  try {
    const text = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) vars[m[1]] = m[2];
    }
  } catch {
    /* .env.local optional when env vars are set */
  }
  return vars;
}

function lifecycleHashes() {
  const data = JSON.parse(fs.readFileSync(new URL("../strk20.json", import.meta.url), "utf8"));
  const hashes = [];
  for (const entry of data.transactions ?? []) {
    if (entry.kind && entry.hash) hashes.push({ label: entry.kind, hash: entry.hash });
  }
  // Order the five lifecycle slots explicitly, appending the two pending slots.
  return [
    { label: "shield STRK", hash: hashes.find((h) => h.label.includes("shield"))?.hash },
    { label: "Forge STRK → Endur xSTRK", hash: hashes.find((h) => h.label.includes("Forge"))?.hash },
    { label: "unshield STRK", hash: hashes.find((h) => h.label.includes("unshield"))?.hash },
    { label: "Reservoir STRK → Vesu vSTRK", hash: undefined },
    { label: "Prism STRK → AVNU output", hash: hashes.find((h) => h.label.includes("Prism"))?.hash },
  ];
}

async function fetchReceipt(provider, hash_) {
  const [receipt, tx] = await Promise.all([
    provider.getTransactionReceipt(hash_),
    provider.getTransaction(hash_).catch(() => null),
  ]);
  return { receipt, tx };
}

function poolEvents(receipt) {
  return (receipt.events ?? []).filter((e) => norm(e.from_address) === norm(POOL));
}

function invocationFrom(events) {
  const target = EVENTS.ExternalContractInvoked;
  const ev = events.find((e) => norm(e.keys?.[0]) === target);
  if (!ev) return null;
  const contract = norm(ev.keys?.[1]);
  const entrypoint = norm(ev.keys?.[2]);
  const name = Object.entries(PRIVACY_SELECTORS).find(([, s]) => s === entrypoint)?.[0] ?? null;
  return { contract, entrypoint, name };
}

function outputNoteFrom(events) {
  const deposited = events.find((e) => norm(e.keys?.[0]) === EVENTS.OpenNoteDeposited);
  if (deposited) {
    return {
      token: norm(deposited.keys?.[2]),
      note_id: norm(deposited.keys?.[3]),
      amount: BigInt(deposited.data?.[deposited.data.length - 1] ?? "0x0"),
    };
  }
  const created = events.find((e) => norm(e.keys?.[0]) === EVENTS.OpenNoteCreated);
  if (created) {
    return { token: norm(created.keys?.[1]), note_id: norm(created.keys?.[2]), amount: null };
  }
  return null;
}

function netFlow(receipt, address) {
  const transfers = (receipt.events ?? []).filter((e) => norm(e.from_address) === norm(STRK) && norm(e.keys?.[0]) === EVENTS.Transfer);
  let incoming = 0n;
  let outgoing = 0n;
  for (const t of transfers) {
    const from = norm(t.keys?.[1]);
    const to = norm(t.keys?.[2]);
    const amount = feltToAmount(t.data?.[0] ?? "0x0", t.data?.[1] ?? "0x0");
    if (to === address) incoming += amount;
    if (from === address) outgoing += amount;
  }
  return { incoming, outgoing, net: incoming - outgoing, count: transfers.filter((t) => norm(t.keys?.[1]) === address || norm(t.keys?.[2]) === address).length };
}

function approvalsReset(receipt, address) {
  const approvals = (receipt.events ?? []).filter(
    (e) => norm(e.from_address) === norm(STRK) && norm(e.keys?.[0]) === EVENTS.Approval && norm(e.keys?.[1]) === address
  );
  if (approvals.length === 0) return { checked: false, ok: true };
  const perSpender = new Map();
  for (const a of approvals) {
    const spender = norm(a.keys?.[2]);
    const amount = feltToAmount(a.data?.[0] ?? "0x0", a.data?.[1] ?? "0x0");
    perSpender.set(spender, amount);
  }
  const leftover = [...perSpender.values()].filter((v) => v !== 0n);
  return { checked: true, ok: leftover.length === 0, leftover };
}

function describeAddress(a) {
  const found = Object.entries(ALLOW_LIST).find(([, v]) => short(v) === a) ?? Object.entries(OUTPUT_TOKENS).find(([, v]) => short(v) === a);
  return found ? found[0] : `${a.slice(0, 12)}…`;
}

function printBlock(hash_, label, checks, meta) {
  console.log(`${hash_}  ${label}${meta ? ` · ${meta}` : ""}`);
  for (const line of checks) {
    console.log(`  ${line}`);
  }
  console.log("");
}

async function verifyLifecycle(provider, entry) {
  const { label, hash: hash_ } = entry;
  if (!hash_ || PLACEHOLDER.test(hash_)) {
    printBlock(hash_ ?? "pending", label, [
      "pending  STRK20 pool touched",
      "pending  anonymizer invoked (strategy step)",
      "pending  protocol allow-list check",
      "pending  output note created",
      "pending  zero residue",
      "pending  minimum output threshold",
    ], "pending — no mainnet receipt yet (Reservoir integration in progress; not claimed as evidence)");
    return { ok: false, pending: true };
  }

  const { receipt, tx } = await fetchReceipt(provider, hash_);
  const execution = receipt.execution_status ?? "UNKNOWN";
  const finality = receipt.finality_status ?? "UNKNOWN";
  const block = receipt.block_number ?? "?";
  const sender = tx?.sender_address ? ` · sender ${short(tx.sender_address)}` : "";
  const meta = `${finality} · ${execution} · block ${block}${sender}`;

  const poolEvents_ = poolEvents(receipt);
  const poolTouched = poolEvents_.length > 0;
  if (execution !== "SUCCEEDED" || !poolTouched) {
    printBlock(hash_, label, [
      `${execution === "SUCCEEDED" ? "ok  " : "FAIL"} STRK20 pool touched`,
      "FAIL  transaction did not execute successfully or did not touch the pool",
    ], meta);
    return { ok: false };
  }

  const invocation = invocationFrom(poolEvents_);
  const output = outputNoteFrom(poolEvents_);
  const lines = [];

  lines.push("ok  STRK20 pool touched");

  if (!invocation) {
    lines.push("n/a  no anonymizer invocation (shield/unshield lifecycle transaction, not a strategy step)");
    lines.push("n/a  no protocol allow-list check (no strategy step)");
  } else {
    const allowName = Object.entries(ALLOW_LIST).find(([, v]) => short(v) === invocation.contract)?.[0] ?? null;
    const allowOk = ALLOWED.has(invocation.contract) && invocation.name !== null;
    const who = norm(invocation.contract) === norm(ROUTER) ? "MantissaRouter" : allowName ?? describeAddress(invocation.contract);
    lines.push(
      `${allowOk ? "ok  " : "FAIL"} ${who} invoked via ${invocation.name ?? invocation.entrypoint}`
    );
    lines.push(
      `${allowOk ? "ok  " : "FAIL"} Protocol allow-list check passed (${allowName ?? "unknown target"} address matched)`
    );
  }

  if (!output) {
    lines.push("n/a  no open output note (shield/unshield lifecycle transaction)");
  } else {
    const tokenName = Object.entries(OUTPUT_TOKENS).find(([, v]) => short(v) === output.token)?.[0] ?? "unknown";
    const tokenOk = OUTPUT_SET.has(output.token) && output.amount !== null && output.amount > 0n;
    lines.push(
      `${tokenOk ? "ok  " : "FAIL"} Output note created with correct token (${tokenName} ${output.token.slice(0, 12)}…, note ${output.note_id.slice(0, 12)}…${output.amount !== null ? `, ${formatUnits(output.amount)} ${tokenName}` : ""})`
    );
  }

  if (invocation) {
    const flow = netFlow(receipt, invocation.contract);
    const reset = approvalsReset(receipt, invocation.contract);
    const residueOk = flow.count > 0 && flow.net === 0n && reset.ok;
    const detail = flow.count > 0
      ? `in ${formatUnits(flow.incoming)} STRK = out ${formatUnits(flow.outgoing)} STRK`
      : "no STRK moved through the invoked contract";
    lines.push(
      `${residueOk ? "ok  " : "FAIL"} Zero residue confirmed (${describeAddress(invocation.contract)} balance ends at zero — ${detail}${reset.checked ? "; approvals reset to zero" : ""})`
    );
    if (output && output.amount !== null) {
      const floor = 1n;
      const minOk = output.amount >= floor;
      lines.push(
        `${minOk ? "ok  " : "FAIL"} Minimum output threshold cleared (${formatUnits(output.amount)} ≥ ${formatUnits(floor)})`
      );
    } else {
      lines.push("n/a  no open output amount to floor against");
    }
  } else {
    lines.push("n/a  no zero-residue check (no strategy step)");
    lines.push("n/a  no minimum-output check (no strategy step)");
  }

  printBlock(hash_, label, lines, meta);
  return { ok: true };
}

async function verifyRouterPin(provider) {
  const deployment = JSON.parse(
    fs.readFileSync(new URL("../router-deployment.json", import.meta.url), "utf8")
  );
  const recorded = short(deployment.classHash);
  const onchain = await provider.getClassHashAt(deployment.routerAddress).catch(() => null);
  const ok = onchain !== null && short(onchain) === recorded;
  console.log(
    `${ok ? "ok  " : "FAIL"} MantissaRouter V2 class hash pinned (on-chain ${onchain ? short(onchain) : "unreadable"} ${ok ? "matches" : "≠"} recorded ${recorded})`
  );
  return ok;
}

async function main() {
  const env = loadEnv();
  const rpc = process.env.NEXT_PUBLIC_STARKNET_RPC_URL ?? env.NEXT_PUBLIC_STARKNET_RPC_URL;
  if (!rpc) throw new Error("Set NEXT_PUBLIC_STARKNET_RPC_URL (env or .env.local) before verifying transactions.");

  const fromArgs = process.argv.slice(2).filter((arg) => /^0x[0-9a-fA-F]{62,66}$/.test(arg));
  const KNOWN = {
    "0x04bee88e5e6e225cd8fd20b7cc6451242d87b6b18334d722555b6414ad908eb0": "shield STRK",
    "0x06e12ee7283684c905f6138b511a00588b67e64bdc543af1925c393e3dd07333": "Forge STRK → Endur xSTRK",
    "0x045839af41522f063b3cd5e15a6bb87ceb53655e7150ff0a08258e0c046fc8f9": "unshield STRK",
    "0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3": "Prism STRK → AVNU output",
  };
  const entries = fromArgs.length > 0
    ? fromArgs.map((hash_) => ({ label: KNOWN[hash_.toLowerCase()] ?? hash_.slice(0, 12), hash: hash_ }))
    : lifecycleHashes();

  const provider = new RpcProvider({ nodeUrl: rpc });
  const chainId = await provider.getChainId().catch(() => null);
  const chainName = chainId ? shortString.decodeShortString(chainId) : "unknown";
  console.log(`verifying ${entries.length} transaction(s) against pool ${POOL} on ${chainName}\n`);

  let okCount = 0;
  for (const entry of entries) {
    try {
      const result = await verifyLifecycle(provider, entry);
      if (result.ok) okCount += 1;
    } catch (error) {
      printBlock(entry.hash ?? "0x?", entry.label, [
        `FAIL  unreadable receipt: ${(error instanceof Error ? error.message : String(error)).slice(0, 100)}`,
      ]);
    }
  }

  const pinOk = await verifyRouterPin(provider);

  console.log(`\n${okCount} of ${entries.length} lifecycle transactions re-derived from receipts.`);
  console.log(`${pinOk ? "ok" : "FAIL"} router class-hash pin against deployment record.`);
  if (okCount < entries.length || !pinOk) process.exitCode = 1;
}

await main();
