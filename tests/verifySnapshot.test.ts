import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const snapshot = fs.readFileSync(
  path.join(process.cwd(), "evidence", "mainnet-verify-5-of-5.txt"),
  "utf8"
);

const HASHES = [
  "0x04bee88e5e6e225cd8fd20b7cc6451242d87b6b18334d722555b6414ad908eb0",
  "0x06e12ee7283684c905f6138b511a00588b67e64bdc543af1925c393e3dd07333",
  "0x045839af41522f063b3cd5e15a6bb87ceb53655e7150ff0a08258e0c046fc8f9",
  "0x06f749fafee519140c48f57d1882b04f3107fb453728d84d57bc0aa63c85acc8",
  "0x78815ce99e5279f44f2544669b5f4ad7a333b7535f22103b137a1a85e0aa6b3",
];

describe("evidence snapshot (evidence/mainnet-verify-5-of-5.txt)", () => {
  it("covers all five lifecycle hashes with accepted finality", () => {
    for (const h of HASHES) {
      expect(snapshot).toContain(h);
    }
    const accepted = (snapshot.match(/ACCEPTED_ON_L1|ACCEPTED_ON_L2/g) ?? []).length;
    expect(accepted).toBeGreaterThanOrEqual(5);
  });

  it("never prints the pending placeholder", () => {
    expect(snapshot).not.toMatch(/<PASTE_[A-Z_]+_TX_HASH>/);
    expect(snapshot).not.toMatch(/pending/);
  });

  it("keeps the per-strategy checklist facts", () => {
    expect(snapshot).toContain("Forge STRK");
    expect(snapshot).toContain("Endur deposit anonymizer invoked");
    expect(snapshot).toContain("MantissaRouter V3");
    expect(snapshot).toContain("MantissaRouter V2");
  });

  it("explains shield/unshield n/a rows instead of hiding them", () => {
    const naRows = (snapshot.match(/n\/a  no /g) ?? []).length;
    expect(naRows).toBeGreaterThanOrEqual(10);
    expect(snapshot).toContain("not a strategy step");
  });

  it("confirms zero false clears: no FAIL rows in the published snapshot", () => {
    expect(snapshot).not.toContain("FAIL");
  });
});
