import fs from "node:fs";
import { RpcProvider } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const base = env.NEXT_PUBLIC_STARKNET_RPC_URL;
for (const version of ["v0_7", "v0_8", "v0_9"]) {
  const url = base.replace(/v0_[789]/, version);
  try {
    const provider = new RpcProvider({ nodeUrl: url });
    console.log(version, await provider.getSpecVersion());
  } catch (error) {
    console.log(version, "ERROR", error instanceof Error ? error.message.slice(0, 160) : String(error));
  }
}
