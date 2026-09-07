import { describe, expect, it, vi, beforeEach } from "vitest";

const ROUTER = "0x74fc61266f234638786bcacc057b6bc7129f8f08c0e2d21a199d5e0b7f460bc";
const AVNU_EXECUTOR = "0x426dcd1ab5fa2f852f138d07cb37708b00a4db999677fe2d0c9a440702dbe5e";
const AVNU_ROUTER = "0x4270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f";
const VESU = "0x6d6d2bf905dd199c78f2e421521d8473042737be9f47904e7578536c10f279d";
const STRK = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

function seedEnv() {
  process.env.NEXT_PUBLIC_ROUTER_ADDRESS = ROUTER;
  process.env.NEXT_PUBLIC_AVNU_PRIVATE_EXECUTOR_ADDRESS = AVNU_EXECUTOR;
  process.env.NEXT_PUBLIC_AVNU_ROUTER_ADDRESS = AVNU_ROUTER;
  process.env.NEXT_PUBLIC_VESU_VAULT_ADDRESS = VESU;
  process.env.NEXT_PUBLIC_ENDUR_XSTRK_ADDRESS = "0x28d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a";
  process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS = STRK;
}

async function freshRecipes() {
  seedEnv();
  vi.resetModules();
  return await import("./recipes");
}

const felt = (v: bigint) => `0x${v.toString(16)}`;

function avnuSwapCalldata(length: number, buyAmount = 100_000_000_000_000_000_000n): string[] {
  const calldata: string[] = Array.from({ length }, (_, i) => (i === 4 ? felt(buyAmount) : "0x0"));
  return calldata;
}

describe("recipe guards that failed in production", () => {
  beforeEach(() => {
    vi.resetModules();
    seedEnv();
  });

  it("pins the AVNU multi_route_swap beneficiary to the router (calldata[8])", async () => {
    const { buildAvnuRecipe } = await freshRecipes();
    const plan = buildAvnuRecipe({
      amount: 2_000_000_000_000_000_000n,
      outputToken: ETH,
      builtCalls: [{ contractAddress: AVNU_ROUTER, entrypoint: "multi_route_swap", calldata: avnuSwapCalldata(12) }],
    });
    expect(plan.steps[0].calldata[8]).toBe(BigInt(ROUTER));
  });

  it("derives the router's own 99% minimum-output floor from the quoted buy amount", async () => {
    const { buildAvnuRecipe } = await freshRecipes();
    const buyAmount = 100_000_000_000_000_000_000n;
    const plan = buildAvnuRecipe({
      amount: 2_000_000_000_000_000_000n,
      outputToken: ETH,
      builtCalls: [{ contractAddress: AVNU_ROUTER, entrypoint: "multi_route_swap", calldata: avnuSwapCalldata(12, buyAmount) }],
    });
    expect(plan.outputs[0].minAmount).toBe((buyAmount * 99n) / 100n);
  });

  it("rejects an AVNU build target that is not the allow-listed AVNU router", async () => {
    const { buildAvnuRecipe } = await freshRecipes();
    expect(() =>
      buildAvnuRecipe({
        amount: 2_000_000_000_000_000_000n,
        outputToken: ETH,
        builtCalls: [{ contractAddress: "0x1234", entrypoint: "multi_route_swap", calldata: avnuSwapCalldata(12) }],
      })
    ).toThrow(/not the allow-listed AVNU router/);
  });

  it("rejects AVNU calldata that is missing the beneficiary field", async () => {
    const { buildAvnuRecipe } = await freshRecipes();
    expect(() =>
      buildAvnuRecipe({
        amount: 2_000_000_000_000_000_000n,
        outputToken: ETH,
        builtCalls: [{ contractAddress: AVNU_ROUTER, entrypoint: "multi_route_swap", calldata: avnuSwapCalldata(8) }],
      })
    ).toThrow(/missing the beneficiary field/);
  });

  it("rejects AVNU calldata beyond the router's 64-felt bound", async () => {
    const { buildAvnuRecipe } = await freshRecipes();
    expect(() =>
      buildAvnuRecipe({
        amount: 2_000_000_000_000_000_000n,
        outputToken: ETH,
        builtCalls: [{ contractAddress: AVNU_ROUTER, entrypoint: "multi_route_swap", calldata: avnuSwapCalldata(65) }],
      })
    ).toThrow(/64/);
  });

  it("rejects a Prism output that is the STRK input token", async () => {
    const { buildAvnuRecipe } = await freshRecipes();
    expect(() =>
      buildAvnuRecipe({
        amount: 2_000_000_000_000_000_000n,
        outputToken: STRK,
        builtCalls: [{ contractAddress: AVNU_ROUTER, entrypoint: "multi_route_swap", calldata: avnuSwapCalldata(12) }],
      })
    ).toThrow(/non-STRK/);
  });

  it("builds the Vesu ERC-4626 deposit with u256 limbs then the router as receiver", async () => {
    const { buildVesuRecipe, normAddr } = await freshRecipes();
    const amount = 2_000_000_000_000_000_000n;
    const plan = buildVesuRecipe(amount);
    const calldata = plan.steps[0].calldata;
    expect(calldata[0]).toBe(amount & ((1n << 128n) - 1n));
    expect(calldata[1]).toBe(amount >> 128n);
    expect(normAddr(calldata[2])).toBe(normAddr(ROUTER));
    expect(normAddr(plan.outputs[0].token)).toBe(normAddr(VESU));
  });

  it("rejects a Vesu output that is not the verified vSTRK vault", async () => {
    const { buildVesuRecipe } = await freshRecipes();
    expect(() => buildVesuRecipe(1n, STRK)).toThrow(/verified Vesu vSTRK/);
  });
});

describe("plan validation and encoding", () => {
  it("rejects plans whose step count exceeds the safety bound", async () => {
    const { validatePlan, buildVesuRecipe } = await freshRecipes();
    const base = buildVesuRecipe(1n);
    const oversized = { ...base, steps: Array.from({ length: 9 }, () => base.steps[0]) };
    expect(() => validatePlan(oversized)).toThrow(/step safety limit/);
  });

  it("rejects duplicate output tokens", async () => {
    const { validatePlan, buildVesuRecipe } = await freshRecipes();
    const base = buildVesuRecipe(1n);
    const dup = { ...base, outputs: [...base.outputs, ...base.outputs] };
    expect(() => validatePlan(dup)).toThrow(/once/);
  });

  it("rejects calldata beyond the per-step bound", async () => {
    const { validatePlan, buildVesuRecipe } = await freshRecipes();
    const base = buildVesuRecipe(1n);
    const wide = {
      ...base,
      steps: [{ ...base.steps[0], calldata: Array.from({ length: 65 }, () => 0n) }],
    };
    expect(() => validatePlan(wide)).toThrow(/calldata safety limit/);
  });

  it("encodes a plan with the pool placeholder and declared lengths in order", async () => {
    const { buildVesuRecipe, encodePlan, POOL_PLACEHOLDER } = await freshRecipes();
    const plan = buildVesuRecipe(1n);
    const data = encodePlan(plan);
    expect(String(data[0])).toBe(POOL_PLACEHOLDER);
    expect(BigInt(data[1])).toBe(1n); // one step
    const step = plan.steps[0];
    expect(data[2]).toBe(step.target);
    expect(data[3]).toBe(step.selector);
    expect(BigInt(data[4])).toBe(BigInt(step.approvals.length));
    expect(BigInt(data[7])).toBe(BigInt(step.calldata.length));
    const outputStart = data.length - 3;
    expect(BigInt(data[outputStart - 1])).toBe(1n); // one output
    expect(data[outputStart]).toBe(plan.outputs[0].token);
  });
});
