import fs from "node:fs";
import { RpcProvider, hash } from "starknet";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const provider = new RpcProvider({ nodeUrl: env.NEXT_PUBLIC_STARKNET_RPC_URL });
const candidates = [...new Set([env.NEXT_PUBLIC_VESU_RECEIPT_ADDRESS, "0x040f67320745980459615f4f3e7dd71002dbe6c68c8249c847c82dbe327b23cb"].filter(Boolean))];
const call = async (address, entrypoint, calldata = []) => provider.callContract({ contractAddress: address, entrypoint, calldata }).catch((error) => [`ERROR:${error instanceof Error ? error.message.slice(0, 100) : String(error)}`]);
const vesu = [];
for (const address of candidates) {
  vesu.push({ address, classHash: await provider.getClassHashAt(address).catch(() => null), name: await call(address, "name"), symbol: await call(address, "symbol"), asset: await call(address, "asset"), previewDeposit: await call(address, "preview_deposit", ["0xde0b6b3a7640000", "0x0"]) });
}
const sellAmount = 10n ** 16n;
const query = new URLSearchParams({ sellTokenAddress: env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS, buyTokenAddress: env.NEXT_PUBLIC_ETH_ADDRESS, sellAmount: `0x${sellAmount.toString(16)}`, size: "1" });
const quoteResponse = await fetch(`https://starknet.api.avnu.fi/swap/v3/quotes?${query}`);
const quotes = quoteResponse.ok ? await quoteResponse.json() : [];
let avnu = { quoteStatus: quoteResponse.status, quote: null, buildStatus: null, build: null };
if (quotes[0]?.quoteId) {
  const buildResponse = await fetch("https://starknet.api.avnu.fi/swap/v3/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: quotes[0].quoteId, slippage: 0.01, private: true }) });
  avnu = { quoteStatus: quoteResponse.status, quote: { quoteId: quotes[0].quoteId, buyAmount: quotes[0].buyAmount }, buildStatus: buildResponse.status, build: buildResponse.ok ? await buildResponse.json() : await buildResponse.text() };
}
console.log(JSON.stringify({ vesu, avnu }, null, 2));
