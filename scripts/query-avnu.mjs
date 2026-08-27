import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
for (const buy of [env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS, env.NEXT_PUBLIC_ETH_ADDRESS, env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS]) {
  const url = new URL("https://starknet.api.avnu.fi/swap/v3/quotes");
  url.searchParams.set("sellTokenAddress", env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS);
  url.searchParams.set("buyTokenAddress", buy);
  url.searchParams.set("sellAmount", "0xde0b6b3a7640000");
  url.searchParams.set("size", "1");
  const response = await fetch(url);
  console.log(buy, response.status, (await response.text()).slice(0, 700));
}
