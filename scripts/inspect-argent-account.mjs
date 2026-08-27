import fs from "node:fs";
import { RpcProvider, ec, hash } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const call = async (entrypoint) => provider.callContract({ contractAddress: env.STARKNET_DEPLOYER_ADDRESS, entrypoint, calldata: [] });
const publicKey = ec.starkCurve.getStarkKey(env.STARKNET_DEPLOYER_PRIVATE_KEY);
const results = {};
for (const entrypoint of ["get_owner", "get_guardian", "get_owner_type", "get_guardian_type", "get_guardian_guid", "get_escape", "get_escape_and_status", "get_escape_security_period", "get_last_owner_escape_attempt", "get_owners_info", "get_guardians_info"]) {
  try { results[entrypoint] = await call(entrypoint); } catch (error) { results[entrypoint] = `ERROR: ${error instanceof Error ? error.message.slice(0, 180) : String(error)}`; }
}
results.configuredKeyMatchesOwner = Array.isArray(results.get_owner) && results.get_owner.some((value) => BigInt(value) === BigInt(publicKey));
results.accountClassHash = await provider.getClassHashAt(env.STARKNET_DEPLOYER_ADDRESS);
console.log(JSON.stringify(results, null, 2));
