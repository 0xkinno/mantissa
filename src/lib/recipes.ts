import { AVNU_PRIVATE_EXECUTOR_ADDRESS, AVNU_ROUTER_ADDRESS, ENDUR_XSTRK_ADDRESS, ROUTER_ADDRESS, STRK_TOKEN_ADDRESS, VESU_VAULT_ADDRESS } from "./config";
import { hash } from "starknet";
export type Felt = string | bigint;
export type Approval = { token: Felt; amount: bigint };
export type Step = { target: Felt; selector: Felt; approvals: Approval[]; calldata: Felt[] };
export type Output = { token: Felt; noteId: Felt; minAmount: bigint };
export type Plan = { steps: Step[]; outputs: Output[] };
export const normAddr = (value: Felt): string => `0x${BigInt(value).toString(16)}`;
export const u256 = (value: bigint): Felt[] => [value & ((1n << 128n) - 1n), value >> 128n];

export const POOL_PLACEHOLDER = "${poolAddress}";
export const OPEN_NOTE = (index: number) => `\${openNoteIds[${index}]}`;
export function validatePlan(plan: Plan, maxSteps = 8, maxCalldata = 64): void {
  if (!plan.steps.length) throw new Error("A strategy must contain at least one step.");
  if (plan.steps.length > maxSteps) throw new Error(`Strategy exceeds the ${maxSteps}-step safety limit.`);
  if (plan.outputs.some((item, i, all) => all.findIndex((x) => String(x.token) === String(item.token)) !== i)) throw new Error("Each output token may appear only once.");
  plan.steps.forEach((step, index) => { if (step.calldata.length > maxCalldata) throw new Error(`Step ${index + 1} exceeds the calldata safety limit.`); });
}
export function encodePlan(plan: Plan): Felt[] {
  validatePlan(plan); const data: Felt[] = [POOL_PLACEHOLDER, BigInt(plan.steps.length)];
  for (const step of plan.steps) { data.push(step.target, step.selector, BigInt(step.approvals.length)); for (const approval of step.approvals) data.push(approval.token, approval.amount); data.push(BigInt(step.calldata.length), ...step.calldata); }
  data.push(BigInt(plan.outputs.length)); for (const output of plan.outputs) data.push(output.token, output.noteId, output.minAmount); return data;
}
export type Strategy = { slug: string; name: string; eyebrow: string; description: string; apy: string; color: "forest" | "indigo"; target?: string };
export const strategies: Strategy[] = [
  { slug: "forge", name: "Forge", eyebrow: "Endur · liquid staking", description: "Convert shielded STRK into xSTRK yield through the Mantissa Router.", apy: "8.4% variable APY", color: "forest" },
  { slug: "reservoir", name: "Reservoir", eyebrow: "Vesu · lending", description: "Supply shielded STRK to a Vesu vault and receive private receipt tokens.", apy: "6.1% variable APY", color: "indigo" },
  { slug: "prism", name: "Prism", eyebrow: "AVNU · private swap", description: "Swap shielded assets through a protected route with a minimum-output floor.", apy: "Route protected", color: "forest" }
];
export function buildRecipe(strategy: Strategy, amount: bigint, outputToken: string): Plan {
  if (!ROUTER_ADDRESS) throw new Error("Mantissa Router is not deployed yet. Configure NEXT_PUBLIC_ROUTER_ADDRESS before executing a yield strategy.");
  if (strategy.slug === "forge") {
    if (!ENDUR_XSTRK_ADDRESS || normAddr(outputToken) !== normAddr(ENDUR_XSTRK_ADDRESS)) throw new Error("Forge requires the verified Endur xSTRK vault/output token.");
    return { steps: [{ target: ENDUR_XSTRK_ADDRESS, selector: "0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01", approvals: [{ token: STRK_TOKEN_ADDRESS, amount }], calldata: [...u256(amount), ROUTER_ADDRESS] }], outputs: [{ token: outputToken, noteId: OPEN_NOTE(0), minAmount: 1n }] };
  }
  if (strategy.slug === "reservoir") {
    if (!VESU_VAULT_ADDRESS || normAddr(outputToken) !== normAddr(VESU_VAULT_ADDRESS)) throw new Error("Reservoir requires the verified Vesu vSTRK vault/output token.");
    return { steps: [{ target: VESU_VAULT_ADDRESS, selector: hash.getSelectorFromName("deposit"), approvals: [{ token: STRK_TOKEN_ADDRESS, amount }], calldata: [...u256(amount), ROUTER_ADDRESS] }], outputs: [{ token: outputToken, noteId: OPEN_NOTE(0), minAmount: 1n }] };
  }
  if (strategy.slug === "prism" && !AVNU_PRIVATE_EXECUTOR_ADDRESS) throw new Error("Prism requires a current AVNU private executor quote.");
  throw new Error("Prism requires a fresh AVNU quote/build response; use the private action quote flow before signing.");
}

/** Build the Vesu ERC-4626 deposit used by Reservoir. */
export function buildVesuRecipe(amount: bigint, outputToken = VESU_VAULT_ADDRESS): Plan {
  if (!VESU_VAULT_ADDRESS || normAddr(outputToken) !== normAddr(VESU_VAULT_ADDRESS)) throw new Error("Reservoir requires the verified Vesu vSTRK vault.");
  return { steps: [{ target: VESU_VAULT_ADDRESS, selector: hash.getSelectorFromName("deposit"), approvals: [{ token: STRK_TOKEN_ADDRESS, amount }], calldata: [...u256(amount), ROUTER_ADDRESS] }], outputs: [{ token: outputToken, noteId: OPEN_NOTE(0), minAmount: 1n }] };
}

/** Adapt a fresh AVNU private build response into a bounded router plan. */
export function buildAvnuRecipe(args: { amount: bigint; outputToken: string; builtCalls: Array<{ contractAddress: string; entrypoint: string; calldata: Array<string | bigint> }>; }): Plan {
  if (!AVNU_PRIVATE_EXECUTOR_ADDRESS || !AVNU_ROUTER_ADDRESS) throw new Error("AVNU router and private executor must be configured.");
  if (!ROUTER_ADDRESS) throw new Error("Mantissa Router is not configured; set NEXT_PUBLIC_ROUTER_ADDRESS.");
  if (!args.outputToken || normAddr(args.outputToken) === normAddr(STRK_TOKEN_ADDRESS)) throw new Error("Prism output must be a non-STRK token.");
  const swap = args.builtCalls.find((call) => call.entrypoint === "multi_route_swap");
  if (!swap) throw new Error("AVNU build did not return a multi_route_swap call.");
  if (normAddr(swap.contractAddress) !== normAddr(AVNU_ROUTER_ADDRESS)) throw new Error("AVNU build target is not the allow-listed AVNU router.");
  const calldata = swap.calldata.map((value) => typeof value === "bigint" ? value : BigInt(value));
  if (calldata.length > 64) throw new Error(`AVNU route has ${calldata.length} calldata felts; router limit is 64.`);
  if (calldata.some((value) => value < 0n)) throw new Error("AVNU calldata contains a negative felt.");
  // AVNU's multi_route_swap enforces beneficiary == caller, and MantissaRouter is
  // the caller. The v3 calldata layout puts the beneficiary at index 8; pin it to
  // the router so proceeds land on the router for the pool's output note.
  if (calldata.length < 9) throw new Error("AVNU multi_route_swap calldata is missing the beneficiary field.");
  calldata[8] = BigInt(ROUTER_ADDRESS);
  // Independent floor for invariant I5: 99% of the quoted buy amount (AVNU applies
  // its own 1% slippage inside the route; this floor is the router's own check).
  const buyAmount = (calldata[4] ?? 0n) + ((calldata[5] ?? 0n) << 128n);
  const minAmount = (buyAmount * 99n) / 100n;
  return { steps: [{ target: swap.contractAddress, selector: hash.getSelectorFromName("multi_route_swap"), approvals: [{ token: STRK_TOKEN_ADDRESS, amount: args.amount }], calldata }], outputs: [{ token: args.outputToken, noteId: OPEN_NOTE(0), minAmount }] };
}
