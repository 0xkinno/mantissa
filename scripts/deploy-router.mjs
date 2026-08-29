import fs from "node:fs";
import { Account, Contract, RpcProvider, json } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
for (const key of ["NEXT_PUBLIC_STARKNET_RPC_URL", "NEXT_PUBLIC_POOL_ADDRESS", "STARKNET_DEPLOYER_ADDRESS", "STARKNET_DEPLOYER_PRIVATE_KEY"]) if (!env[key]) throw new Error(`${key} is missing.`);
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const account = new Account({ provider, address: env.STARKNET_DEPLOYER_ADDRESS, signer: env.STARKNET_DEPLOYER_PRIVATE_KEY });
const artifact = JSON.parse(fs.readFileSync("contracts/target/dev/mantissa_router_MantissaRouter.contract_class.json", "utf8"));
const compiled = JSON.parse(fs.readFileSync("contracts/target/dev/mantissa_router_MantissaRouter.compiled_contract_class.json", "utf8"));
let classHash;
let declareTx;
try {
  const declare = await account.declare({ contract: artifact, casm: compiled });
  await provider.waitForTransaction(declare.transaction_hash);
  classHash = declare.class_hash;
  declareTx = declare.transaction_hash;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/Class with hash (0x[0-9a-f]+) is already declared/i);
  if (!match) throw error;
  classHash = match[1];
  declareTx = null;
}
// Endur's xSTRK is an ERC-4626-style vault: it is both the Forge output token
// and the callable deposit endpoint. Vesu's V2 vSTRK is the same shape: the
// v-token's deposit() pulls STRK from the caller and mints vSTRK to the receiver,
// so it is allow-listed both as a Reservoir target and as an output token.
const targets = [...new Set([env.NEXT_PUBLIC_AVNU_ROUTER_ADDRESS, env.NEXT_PUBLIC_AVNU_PRIVATE_EXECUTOR_ADDRESS, env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS, env.NEXT_PUBLIC_VESU_VAULT_ADDRESS, env.NEXT_PUBLIC_VESU_RECEIPT_ADDRESS, env.NEXT_PUBLIC_EKUBO_ROUTER_ADDRESS].filter(Boolean))];
const outputTokens = [...new Set([env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS, env.NEXT_PUBLIC_VESU_RECEIPT_ADDRESS, env.NEXT_PUBLIC_VESU_VAULT_ADDRESS, env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS, env.NEXT_PUBLIC_ETH_ADDRESS].filter(Boolean))];
if (!env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS) throw new Error("NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS is required for Forge.");
if (!env.NEXT_PUBLIC_VESU_RECEIPT_ADDRESS) throw new Error("NEXT_PUBLIC_VESU_RECEIPT_ADDRESS must be verified before the immutable router deployment.");
const deployment = await account.deployContract({ classHash, constructorCalldata: [env.NEXT_PUBLIC_POOL_ADDRESS, targets.length.toString(), ...targets, outputTokens.length.toString(), ...outputTokens] });
await provider.waitForTransaction(deployment.transaction_hash);
const output = { classHash, declareTx, routerAddress: deployment.contract_address, deployTx: deployment.transaction_hash, allowedTargets: targets, allowedOutputTokens: outputTokens };
fs.writeFileSync("router-deployment.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
