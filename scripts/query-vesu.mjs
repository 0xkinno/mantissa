import fs from "node:fs";
import https from "node:https";
import { hash } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const rpc = new URL(env.NEXT_PUBLIC_STARKNET_RPC_URL);
const factory = "0x3760f903a37948f97302736f89ce30290e45f441559325026842b7a6fb388c0";
const pools = [
  "0x451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5",
  "0x2eef0c13b10b487ea5916b54c0a7f98ec43fb3048f60fdeedaf5b08f6f88aaf",
  "0x3976cac265a12609934089004df458ea29c776d77da423c96dc761d09d24124",
  "0x3a8416bf20d036df5b1cf3447630a2e1cb04685f6b0c3a70ed7fb1473548ecf",
  "0x73702fce24aba36da1eac539bd4bae62d4d6a76747b7cdd3e016da754d7a135",
  "0x5c03e7e0ccfe79c634782388eb1e6ed4e8e2a013ab0fcc055140805e46261bd",
];
const strk = env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS;

function call(selector, calldata) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "starknet_call", params: { request: { contract_address: factory, entry_point_selector: hash.getSelectorFromName(selector), calldata }, block_id: "latest" } });
    const request = https.request(rpc, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (response) => { let data = ""; response.on("data", (chunk) => { data += chunk; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } }); });
    request.on("error", () => resolve({})); request.write(body); request.end();
  });
}

for (const pool of pools) {
  const result = await call("v_token_for_asset", [pool, strk]);
  console.log(pool, JSON.stringify(result.result ?? result.error?.message ?? null));
}
