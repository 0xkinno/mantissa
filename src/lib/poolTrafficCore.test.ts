import { describe, expect, it } from "vitest";
import { hash } from "starknet";
import {
  POOL_DEPOSIT_SELECTOR,
  POOL_WITHDRAWAL_SELECTOR,
  decodePoolLeg,
  normHex,
  sameRoughBand,
  magnitudeOf,
  roughBandLabel,
  countPeersInBand,
  wholeUnits,
  type PoolLeg,
} from "./poolTrafficCore";

const STRK = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const norm = (v: string | bigint) => "0x" + BigInt(v).toString(16);
const sel = (name: string) => "0x" + BigInt(hash.getSelectorFromName(name)).toString(16);

// Fixtures are literal shapes captured from real mainnet receipts:
// shield 0x04bee88e..., unshield 0x045839af..., Prism 0x78815ce9...
const shieldDeposit = {
  keys: [POOL_DEPOSIT_SELECTOR, "0x35011ee98917db19796cd73a26d368c2020e2b69c4133d9bbf0a06310a5b929", STRK],
  data: ["0x1158e460913d00000"], // 20 STRK
};
const feeWithdrawal = {
  keys: [POOL_WITHDRAWAL_SELECTOR, "0x127021a1b5a52d3174c2ab077c2b043c80369250d29428cee956d76ee51584f", STRK],
  data: ["0x1eed60b8d483b3bede62d1cc0f32874aea30747e6943437c858359b41801bf7", "0x564a55c49eb61af9ee75bb68887a25fcefeba363b506e0b45c21c38683d1926", "0x373226160ad90fec7a3a0fdf1b23a53878952f0084000387822813622a0ec0d", "0x53444835ec580000"], // 6 STRK
};
const prismWithdrawal = {
  keys: [POOL_WITHDRAWAL_SELECTOR, "0x327ce0db2f6f0e6abbae89a69245313072dbd3676d0c8090e58e71e56caddca", STRK],
  data: ["0x1eed60b8d483b3bede62d1cc0f32874aea30747e6943437c858359b41801bf7", "0x64d0717fcca821ca0b9eb52c3c3bfe0f23615f0cd25e5a6359785b27a215947", "0x6bffa0874ec527463cf7ac26c6e80935d19127abf4f012df8c8379bc61c6ca0", "0x1bc16d674ec80000"], // 2 STRK
};

describe("pool event decoding against mainnet fixtures", () => {
  it("recognises the canonical Deposit and Withdrawal selectors", () => {
    expect(POOL_DEPOSIT_SELECTOR).toBe(sel("Deposit"));
    expect(POOL_WITHDRAWAL_SELECTOR).toBe(sel("Withdrawal"));
  });

  it("decodes a real shield Deposit (token in keys[2], amount in data[0])", () => {
    const leg = decodePoolLeg(shieldDeposit);
    expect(leg).not.toBeNull();
    expect(leg!.name).toBe("Deposit");
    expect(normHex(leg!.token)).toBe(norm(STRK));
    expect(leg!.amount).toBe(20_000_000_000_000_000_000n);
  });

  it("decodes real Withdrawals (amount is the final data felt)", () => {
    const fee = decodePoolLeg(feeWithdrawal);
    const prism = decodePoolLeg(prismWithdrawal);
    expect(fee!.amount).toBe(6_000_000_000_000_000_000n);
    expect(prism!.amount).toBe(2_000_000_000_000_000_000n);
    expect(fee!.name).toBe("Withdrawal");
    expect(normHex(prism!.token)).toBe(norm(STRK));
  });

  it("refuses shapes it has never seen instead of guessing", () => {
    expect(decodePoolLeg({ keys: [POOL_DEPOSIT_SELECTOR, "0x1", STRK], data: [] })).toBeNull();
    expect(decodePoolLeg({ keys: [POOL_DEPOSIT_SELECTOR, "0x1", STRK], data: ["0x1", "0x2"] })).toBeNull();
    expect(decodePoolLeg({ keys: ["0x1234", "0x1", STRK], data: ["0x5"] })).toBeNull();
    expect(decodePoolLeg({ keys: [], data: [] })).toBeNull();
  });
});

describe("rough size band", () => {
  it("keeps single-unit amounts together and tens apart", () => {
    expect(sameRoughBand(2_000_000_000_000_000_000n, 7_000_000_000_000_000_000n)).toBe(true);
    expect(sameRoughBand(2_000_000_000_000_000_000n, 20_000_000_000_000_000_000n)).toBe(false);
    expect(magnitudeOf(2_000_000_000_000_000_000n)).toBe(0);
    expect(magnitudeOf(20_000_000_000_000_000_000n)).toBe(1);
  });

  it("never counts a zero-amount as a peer", () => {
    expect(sameRoughBand(0n, 2_000_000_000_000_000_000n)).toBe(false);
  });

  it("labels bands in whole units", () => {
    expect(wholeUnits(2_000_000_000_000_000_000n)).toBe(2n);
    expect(roughBandLabel(2_000_000_000_000_000_000n)).toContain("single units");
    expect(roughBandLabel(50_000_000_000_000_000_000n)).toContain("tens");
  });
});

describe("band counting", () => {
  it("counts only same-token peers in the same magnitude", () => {
    const legs: PoolLeg[] = [
      { name: "Withdrawal", token: STRK, amount: 6_000_000_000_000_000_000n },
      { name: "Withdrawal", token: STRK, amount: 7_000_000_000_000_000_000n },
      { name: "Withdrawal", token: STRK, amount: 20_000_000_000_000_000_000n },
      { name: "Deposit", token: STRK, amount: 6_000_000_000_000_000_000n },
    ];
    expect(countPeersInBand(legs, "Withdrawal", STRK, 2_000_000_000_000_000_000n)).toBe(2);
    expect(countPeersInBand(legs, "Deposit", STRK, 2_000_000_000_000_000_000n)).toBe(1);
    expect(countPeersInBand(legs, "Withdrawal", "0x9999", 2_000_000_000_000_000_000n)).toBe(0);
  });
});
