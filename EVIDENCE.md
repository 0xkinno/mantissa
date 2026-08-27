# Evidence ledger

MantissaRouter V2 is deployed on Starknet mainnet and the evidence ledger is rendered by `/proof`. The repository contains verified deployment receipts, protocol target research, bounded Vesu Reservoir and AVNU Prism builders, and wallet-resolved runtime preview support.

Confirmed deployment and lifecycle evidence is recorded in `strk20.json`; explorer links are generated for every ledger entry. The first complete human-operated cycle is now receipt-confirmed: shield STRK, private Forge to Endur xSTRK, and unshield STRK.

When the human operator supplies the RPC and deployer credentials, record for every action:

- transaction hash
- finality and execution status
- pool-touch verification result
- Voyager and Starkscan links
- UTC timestamp

## Completed lifecycle proof

| Action | Mainnet transaction | Result |
|---|---|---|
| Shield STRK | `0x04bee88e5e6e225cd8fd20b7cc6451242d87b6b18334d722555b6414ad908eb0` | Accepted on L2, execution succeeded |
| Forge STRK → Endur xSTRK | `0x06e12ee7283684c905f6138b511a00588b67e64bdc543af1925c393e3dd07333` | Accepted on L2, execution succeeded |
| Unshield STRK | `0x045839af41522f063b3cd5e15a6bb87ceb53655e7150ff0a08258e0c046fc8f9` | Accepted on L2, execution succeeded |
