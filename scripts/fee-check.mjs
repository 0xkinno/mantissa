// fee-check.mjs
// Reads the STRK20 pool's per-operation fee schedule from mainnet (get_fee_amount)
// and writes evidence/pool-fee.json. Used by the "What This Costs" README section.
import fs from "node:fs";
import { rpc, POOL, sel } from "./caller-identity-lib.mjs";

const call = await rpc("starknet_call", [{ contract_address: POOL, entry_point_selector: sel("get_fee_amount"), calldata: [] }, "latest"]);
if (call.error) { console.error("get_fee_amount failed:", JSON.stringify(call.error).slice(0, 300)); process.exit(1); }
const wei = BigInt(call.result?.[0] ?? "0x0");
const out = {
  generatedAt: new Date().toISOString(),
  method: "get_fee_amount",
  pool: POOL,
  wei: wei.toString(),
  strk: Number(wei) / 1e18,
};
console.log("pool per-operation fee:", out.strk, "STRK (", out.wei, "wei )");
fs.writeFileSync("evidence/pool-fee.json", JSON.stringify(out, null, 2), "utf8");
console.log("wrote evidence/pool-fee.json");
