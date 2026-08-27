import fs from "node:fs";
import { RpcProvider } from "starknet";
const data = JSON.parse(fs.readFileSync(new URL("../strk20.json", import.meta.url), "utf8"));
const rpc = process.env.NEXT_PUBLIC_STARKNET_RPC_URL;
if (!rpc) throw new Error("Set NEXT_PUBLIC_STARKNET_RPC_URL before verifying transactions.");
const pool = (process.env.NEXT_PUBLIC_POOL_ADDRESS ?? "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a").toLowerCase();
const provider = new RpcProvider({ nodeUrl: rpc });
for (const entry of data.transactions) {
  const hash = typeof entry === "string" ? entry : entry.hash;
  const receipt = await provider.getTransactionReceipt(hash);
  const execution = receipt.execution_status ?? "UNKNOWN";
  const events = receipt.events ?? [];
  const tx = await provider.getTransaction(hash).catch(() => null);
  const calldata = tx?.calldata ?? [];
  const touchedPool = events.some((event) => String(event.from_address ?? "").toLowerCase() === pool || (event.keys ?? []).some((key) => String(key).toLowerCase() === pool)) || calldata.some((value) => String(value).toLowerCase() === pool);
  console.log(JSON.stringify({ hash, finality: receipt.finality_status, execution, touchedPool }, null, 2));
  if (execution !== "SUCCEEDED" || !touchedPool) process.exitCode = 1;
}
