import fs from "node:fs";
import { Contract, RpcProvider, uint256 } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
for (const key of ["NEXT_PUBLIC_STARKNET_RPC_URL", "STARKNET_DEPLOYER_ADDRESS", "STARKNET_DEPLOYER_PRIVATE_KEY"]) if (!env[key]) throw new Error(`${key} is missing.`);
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const chainId = await provider.getChainId();
const classHash = await provider.getClassHashAt(env.STARKNET_DEPLOYER_ADDRESS);
const abi = [{ type: "function", name: "balanceOf", state_mutability: "view", inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::integer::u256" }] }];
const token = new Contract({ abi, address: env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS, providerOrAccount: provider });
const raw = await token.balanceOf(env.STARKNET_DEPLOYER_ADDRESS);
const balance = typeof raw === "bigint" ? raw : uint256.uint256ToBN(raw);
console.log(JSON.stringify({ chainId, accountDeployed: Boolean(classHash), classHashMatchesEnv: !env.STARKNET_ACCOUNT_CLASS_HASH || BigInt(classHash) === BigInt(env.STARKNET_ACCOUNT_CLASS_HASH), strkBalance: `${balance / 10n ** 18n}.${(balance % 10n ** 18n).toString().padStart(18, "0").slice(0, 4)}` }, null, 2));
