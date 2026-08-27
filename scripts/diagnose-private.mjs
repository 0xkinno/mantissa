import fs from "node:fs";
import { RpcProvider, Contract, uint256, Account } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const address = process.argv[2];
if (!address) throw new Error("Usage: node scripts/diagnose-private.mjs <account-address>");
if (!env.NEXT_PUBLIC_STARKNET_RPC_URL) throw new Error("NEXT_PUBLIC_STARKNET_RPC_URL is missing.");
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const token = new Contract({ abi: [{ type: "function", name: "balanceOf", state_mutability: "view", inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::integer::u256" }] }], address: env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS, providerOrAccount: provider });
const raw = await token.balanceOf(address);
const balance = typeof raw === "bigint" ? raw : uint256.uint256ToBN(raw);
const chainId = await provider.getChainId();
const expected = env.STARKNET_DEPLOYER_ADDRESS?.toLowerCase();
const supplied = address.toLowerCase();
console.log(JSON.stringify({ address, chainId, publicStrkRaw: balance.toString(), publicStrk: `${balance / 10n ** 18n}.${(balance % 10n ** 18n).toString().padStart(18, "0").slice(0, 6)}`, privacyReserve: "6 STRK (wallet-managed; not app code)", recommendedMinimum: "15-20 STRK", matchesConfiguredDeployer: Boolean(expected && expected === supplied), privateActionApi: "STRK20 actions require a Wallet API 0.10+ provider; a raw Account/private key cannot invoke wallet_strk20InvokeTransaction" }, null, 2));
