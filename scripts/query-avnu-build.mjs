import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
for (const buy of [env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS, env.NEXT_PUBLIC_ETH_ADDRESS]) {
  const u = new URL("https://starknet.api.avnu.fi/swap/v3/quotes"); u.searchParams.set("sellTokenAddress", env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS); u.searchParams.set("buyTokenAddress", buy); u.searchParams.set("sellAmount", "0xde0b6b3a7640000"); u.searchParams.set("size", "1");
  const quotes = await (await fetch(u)).json(); const q = quotes[0];
  const b = await fetch("https://starknet.api.avnu.fi/swap/v3/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: q.quoteId, slippage: 0.01, private: true }) });
  console.log(JSON.stringify({ buy, quote: { quoteId: q.quoteId, buyAmount: q.buyAmount }, buildStatus: b.status, build: await b.json() }, null, 2));
}
