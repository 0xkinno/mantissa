import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const buy = env.NEXT_PUBLIC_ETH_ADDRESS; const amount = "0xde0b6b3a7640000";
const u = new URL("https://starknet.api.avnu.fi/swap/v3/quotes"); u.searchParams.set("sellTokenAddress", env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS); u.searchParams.set("buyTokenAddress", buy); u.searchParams.set("sellAmount", amount); u.searchParams.set("takerAddress", env.NEXT_PUBLIC_ROUTER_ADDRESS); u.searchParams.set("size", "1");
const quotes = await (await fetch(u)).json(); const quote = quotes[0];
const response = await fetch("https://starknet.api.avnu.fi/swap/v3/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: quote.quoteId, slippage: 0.01, takerAddress: env.NEXT_PUBLIC_ROUTER_ADDRESS }) });
console.log(JSON.stringify({ quote: { quoteId: quote.quoteId, buyAmount: quote.buyAmount }, status: response.status, build: await response.json() }, null, 2));
