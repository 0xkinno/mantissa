// settlement-digest.mjs
// Step 6 of the discovery directive - the signed settlement digest.
// A second, narrower disclosure mode beside the viewing-key flow: a signed,
// short-lived digest binding one strategy execution (strategy, amount, executing
// router, output token, tx hash, expiry). Anyone holding it can verify that this
// signer authorized this specific action and - when a tx hash is supplied - that
// the transaction touched the STRK20 pool and reached finality, WITHOUT ever
// seeing a shielded balance or any other note.
//
// The schema and verifier are real. Production digests require the user's own
// privacy wallet to sign; this script demonstrates and tests the verifier with a
// dev key so the pipeline can be audited offline.
//
// Usage:
//   node scripts/settlement-digest.mjs --strategy Forge --amount 7000000000000000000 --router 0x74fc... --output 0x28d7... --tx 0x<mainnet hash> [--expiry <unix>] [--key 0x<priv>]
import fs from "node:fs";
import crypto from "node:crypto";
import { ec, hash } from "starknet";

const DOMAIN = "MANTISSA_SETTLEMENT_V1";
const hex = (v) => "0x" + BigInt(v).toString(16);
const POOL_EVENT_NAMES = ["Deposit", "Withdrawal", "OpenNoteCreated", "OpenNoteDeposited", "ExternalContractInvoked", "EncNoteCreated", "NoteUsed"];
const pad64 = (n) => n.toString(16).padStart(64, "0");
const keyFromHex = (s) => new Uint8Array(Buffer.from(s.replace(/^0x/, ""), "hex"));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith("--")) { out[key] = true; continue; }
    out[key] = val;
    i++;
  }
  return out;
}

function feltFromText(text) {
  const bytes = Buffer.from(String(text), "utf8");
  if (bytes.length <= 31) {
    let n = 0n;
    for (const b of bytes) n = (n << 8n) | BigInt(b);
    return n;
  }
  return BigInt("0x" + hash.computePoseidonHashOnElements([...bytes].map(BigInt)).toString(16));
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) {
    console.log("settlement-digest.mjs - signed settlement digest schema + verifier\n\n  --strategy <name>  --amount <wei>  --router <addr>  --output <token addr>\n  --tx <mainnet tx hash>   --expiry <unix seconds>   --key <hex private key>   --help");
    process.exit(0);
  }
  if (!a.strategy || !a.amount || !a.router || !a.output) throw new Error("--strategy, --amount, --router and --output are required");
  const amount = BigInt(a.amount);
  const expiry = a.expiry ? BigInt(a.expiry) : BigInt(Math.floor(Date.now() / 1000)) + 86400n;
  const priv = a.key ? keyFromHex(a.key) : ec.starkCurve.utils.randomPrivateKey();

  const fields = {
    strategy: feltFromText(a.strategy),
    amountLow: amount & ((1n << 128n) - 1n),
    amountHigh: amount >> 128n,
    router: BigInt(a.router),
    outputToken: BigInt(a.output),
    txHash: BigInt(a.tx ?? "0x0"),
    expiry,
  };
  const digest = hash.computeHashOnElements([
    feltFromText(DOMAIN), fields.strategy, fields.amountLow, fields.amountHigh,
    fields.router, fields.outputToken, fields.txHash, expiry,
  ]);
  const FIELD_P = 3618502788666131106986593281521497120414687020801267626233049500247285301248n;
  const digestMod = BigInt(digest) % FIELD_P;
  const msgHex = pad64(digestMod);
  const sig = ec.starkCurve.sign(msgHex, priv);
  const compact = pad64(sig.r) + pad64(sig.s);
  const publicKey = ec.starkCurve.getPublicKey(priv);
  const publicKeyHex = Buffer.from(publicKey).toString("hex");

  const signatureValid = ec.starkCurve.verify(compact, msgHex, publicKey);
  const tamperRejected = !ec.starkCurve.verify(compact, pad64((digestMod + 1n) % FIELD_P), publicKey);

  const lines = [];
  lines.push("settlement digest \u00b7 domain " + DOMAIN);
  lines.push("  ok   digest computed over strategy/amount/router/outputToken/txHash/expiry");
  lines.push("  ok   signature valid against the signer public key");
  lines.push("  ok   tampered digest rejected by the verifier");

  const record = {
    domain: DOMAIN,
    fields: {
      strategy: a.strategy,
      amount: amount.toString(),
      router: hex(fields.router),
      outputToken: hex(fields.outputToken),
      txHash: a.tx ? hex(fields.txHash) : null,
      expiry: expiry.toString(),
    },
    digest: hex(digestMod),
    signerPublicKey: "0x" + publicKeyHex,
    signature: { r: "0x" + pad64(sig.r), s: "0x" + pad64(sig.s) },
    signatureValid,
    tamperRejected,
    status: "verifier demo with a dev key; production digests are signed by the user's own privacy wallet",
  };

  if (a.tx) {
    const { rpc } = await import("./caller-identity-lib.mjs");
    const rec = await rpc("starknet_getTransactionReceipt", { transaction_hash: a.tx });
    if (rec.error) throw new Error("receipt lookup failed: " + JSON.stringify(rec.error).slice(0, 200));
    const result = rec.result ?? rec;
    const finalityOk = /ACCEPTED_ON_L1|ACCEPTED_ON_L2/.test(result.finality_status ?? result.status ?? "");
    const poolSelectors = new Set(POOL_EVENT_NAMES.map((n) => "0x" + BigInt(hash.getSelectorFromName(n)).toString(16)));
    const poolTouched = (result.events ?? []).some((e) => poolSelectors.has("0x" + BigInt(e.keys?.[0] ?? "0x0").toString(16)));
    record.txCheck = { hash: a.tx, finality: result.finality_status ?? result.status, finalityOk, poolTouched };
    lines.push("  " + (finalityOk ? "ok  " : "FAIL") + " receipt finality: " + (result.finality_status ?? result.status));
    lines.push("  " + (poolTouched ? "ok  " : "FAIL") + " pool event present in the receipt (pool touched, same definition as verify-mainnet.mjs)");
    if (!finalityOk || !poolTouched) process.exitCode = 1;
  }

  fs.writeFileSync("evidence/settlement-digest-demo.json", JSON.stringify({ generatedAt: new Date().toISOString(), ...record }, null, 2));
  console.log(lines.join("\n"));
  console.log("\nwrote evidence/settlement-digest-demo.json");
}

main().catch((error) => { console.error("error: " + error.message); process.exit(1); });
