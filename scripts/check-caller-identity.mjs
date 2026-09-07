// check-caller-identity.mjs
// Public preflight CLI (STRK20_INTEGRATION.md / README "For Other Builders").
// Any team building a stateless router on the STRK20 pool can check whether a
// target protocol's entrypoint assumes a privileged/persistent/self-interested
// caller before wiring it in.
//
// Usage:
//   node scripts/check-caller-identity.mjs \
//     --target 0x<contract> \
//     --selector multi_route_swap|0x<selector> \
//     --calldata 0x<felt>,0x<felt>,... \
//     [--router 0x<your router>] \
//     [--funder 0x<account used for the live simulation>] \
//     [--approve 0x<token>:0x<amount>[;0x<token>:0x<amount>...]]
import fs from "node:fs";
import { env, FUNDER, ROUTER, short, trim, sel, checkCallerIdentityAssumptions, printRows, cleanRevert } from "./caller-identity-lib.mjs";

function usage() {
  console.log(`check-caller-identity.mjs - caller-identity preflight for STRK20 router builders

Usage:
  node scripts/check-caller-identity.mjs --target <address> --calldata <felts> [options]

Required:
  --target <address>          target contract the router would call
  --calldata <felts>          calldata sample, comma- or space-separated hex felts
                              (or the name of a JSON file with a "calldata" array)

Options:
  --selector <name|hex>       entry point name or selector (default: none)
  --router <address>          the executing router (default: env NEXT_PUBLIC_ROUTER_ADDRESS)
  --funder <address>          account used for the live simulation (default: env STARKNET_DEPLOYER_ADDRESS)
  --approve <token:amount[;token:amount...]>
                              approvals the step needs, as token:amount pairs
  --help                      show this help`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith("--")) { out[key] = true; continue; }
    out[key] = val;
    i++;
  }
  return out;
}

function parseCalldata(raw) {
  if (!raw) return [];
  const file = raw.trim();
  if (file.endsWith(".json")) {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    const list = Array.isArray(j) ? j : j.calldata;
    if (!Array.isArray(list)) throw new Error("calldata JSON must be an array or { calldata: [...] }");
    return list.map((v) => short(v));
  }
  return raw.split(/[,\s]+/).filter(Boolean).map((v) => short(v));
}

function parseApprovals(raw) {
  if (!raw) return [];
  return raw.split(";").filter(Boolean).map((pair) => {
    const [token, amount] = pair.split(":");
    if (!token || !amount) throw new Error("bad --approve pair: " + pair + " (want token:amount)");
    return { token: short(token), amount: BigInt(amount) };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  const target = args.target;
  const calldata = parseCalldata(args.calldata);
  if (!target || !calldata.length) { usage(); process.exit(2); }

  const approvals = parseApprovals(args.approve);
  const selectorName = args.selector;
  const selector = selectorName ? (selectorName.startsWith("0x") ? short(selectorName) : sel(selectorName)) : undefined;
  const router = args.router ? short(args.router) : short(ROUTER);
  const funder = args.funder ? short(args.funder) : short(FUNDER);

  console.log("caller-identity preflight \u00b7 target " + trim(target) + " \u00b7 selector " + (selectorName ?? "none") + " \u00b7 router " + trim(router) + " \u00b7 " + calldata.length + " calldata felts \u00b7 live mainnet state, no gas spent");
  const rows = await checkCallerIdentityAssumptions(short(target), calldata, {
    selector,
    router,
    funder,
    approvals,
  });
  const summary = printRows(rows);
  console.log("\n" + summary.clean + "/" + summary.total + " preflight checks clean");
  if (summary.clean === summary.total) {
    console.log("no caller-identity tax detected on this entrypoint for this router");
  } else {
    console.log("caller-identity tax detected \u2014 inspect the FAIL rows above before wiring this step in");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("error: " + cleanRevert(error.message));
  process.exit(1);
});
