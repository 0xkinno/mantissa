import fs from "node:fs";
import { ec, hash, num, RpcProvider, Contract, uint256 } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const publicKey = ec.starkCurve.getStarkKey(env.STARKNET_DEPLOYER_PRIVATE_KEY);
const candidates = [
  { name: "OpenZeppelin", classHash: "0x5b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564", calldata: [publicKey], salt: publicKey },
  { name: "Privy", classHash: "0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2", calldata: [publicKey], salt: publicKey },
];
const derived = candidates.map((candidate) => ({ ...candidate, address: hash.calculateContractAddressFromHash(candidate.salt, candidate.classHash, candidate.calldata, 0) }));
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const abi = [{ type: "function", name: "balanceOf", state_mutability: "view", inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::integer::u256" }] }];
const token = new Contract({ abi, address: env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS, providerOrAccount: provider });
const rawBalance = await token.balanceOf(env.STARKNET_DEPLOYER_ADDRESS);
const balance = typeof rawBalance === "bigint" ? rawBalance : uint256.uint256ToBN(rawBalance);
console.log(JSON.stringify({ configuredAddress: env.STARKNET_DEPLOYER_ADDRESS, publicKey, balance: balance.toString(), candidates: derived.map(({ name, classHash, address }) => ({ name, classHash, address, matches: BigInt(address) === BigInt(env.STARKNET_DEPLOYER_ADDRESS) })) }, null, 2));
