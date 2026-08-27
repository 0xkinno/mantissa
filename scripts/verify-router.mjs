import fs from "node:fs";
import { Contract, RpcProvider } from "starknet";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const classHash = await provider.getClassHashAt(env.NEXT_PUBLIC_ROUTER_ADDRESS);
const abi = [
  { type: "function", name: "pool", state_mutability: "view", inputs: [], outputs: [{ type: "core::starknet::contract_address::ContractAddress" }] },
  { type: "function", name: "is_allowed", state_mutability: "view", inputs: [{ name: "target", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::bool" }] },
  { type: "function", name: "is_output_allowed", state_mutability: "view", inputs: [{ name: "token", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::bool" }] }
];
const router = new Contract({ abi, address: env.NEXT_PUBLIC_ROUTER_ADDRESS, providerOrAccount: provider });
const targets = [env.NEXT_PUBLIC_AVNU_ROUTER_ADDRESS, env.NEXT_PUBLIC_AVNU_PRIVATE_EXECUTOR_ADDRESS, env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS, env.NEXT_PUBLIC_VESU_VAULT_ADDRESS, env.NEXT_PUBLIC_EKUBO_ROUTER_ADDRESS];
const outputs = [env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS, env.NEXT_PUBLIC_VESU_RECEIPT_ADDRESS, env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS, env.NEXT_PUBLIC_ETH_ADDRESS];
const result = { classHash, pool: await router.pool(), targets: await Promise.all(targets.map(async (target) => ({ target, allowed: await router.is_allowed(target) }))), outputs: await Promise.all(outputs.map(async (token) => ({ token, allowed: await router.is_output_allowed(token) }))) };
console.log(JSON.stringify(result, (_, value) => typeof value === "bigint" ? `0x${value.toString(16)}` : value, 2));
