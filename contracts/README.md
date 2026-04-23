# SoulPort Contracts

Foundry-based smart contract suite for SoulPort on Base Sepolia.

## Modules

- `SoulPortCore`: orchestrates attest-and-mint flow
- `SchemaRegistry`: registers and stores schema UIDs
- `SoulPortSBT`: soulbound ERC-1155 badge contract
- `ReputationOracle`: stores Web2/Web3 verification signals and computes reputation score
- `ReputationStaking`: ETH staking with slashing controls
- `MockProofVerifier`: demo verifier for hackathon mode

## Directory Layout

- `src/`: contracts and interfaces
- `script/Deploy.s.sol`: deployment script
- `test/SoulPort.t.sol`: integration-focused test suite
- `.env.example`: deployment variable template

## Prerequisites

- Foundry (`forge`, `cast`)
- Base Sepolia RPC URL
- Funded deployer wallet on Base Sepolia

## Environment Setup

Copy `.env.example` to `.env` and configure:

- `PRIVATE_KEY`
- `EAS_SCHEMA_REGISTRY`
- `EAS_ATTESTER`
- `PROOF_VERIFIER` (or use mock mode)
- `TREASURY`
- `GOVERNANCE_OWNER`
- `REGISTER_SCHEMAS`
- `USE_MOCK_PROOF_VERIFIER`

## Build and Test

```bash
forge build
forge test -vv
```

## Deploy (Base Sepolia)

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://sepolia.base.org --broadcast
```

Deployment writes:

- `deployed.json`
- `deployed.env`

## Post-Deploy Verification

1. Confirm contracts exist at emitted addresses
2. Confirm schema UIDs are non-zero from `SchemaRegistry`
3. Confirm ownership transfer to `GOVERNANCE_OWNER`
4. Confirm frontend/backend env files are updated with deployed addresses

## Security Notes

- Never commit `.env` with live keys
- Use dedicated deployer and governance wallets
- Prefer multisig for `GOVERNANCE_OWNER` in non-demo environments
- Keep `USE_MOCK_PROOF_VERIFIER=false` for production
