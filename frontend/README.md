# SoulPort Frontend

The SoulPort frontend is a React + TypeScript application for wallet-based reputation viewing, credential imports, and AI-assisted matching.

## Stack

- React 18 + TypeScript
- WAGMI + Coinbase Wallet connector
- RainbowKit UI wrapper
- Viem + Ethers
- React Router
- TailwindCSS + DaisyUI

## Features

- Wallet connection and profile routing
- On-chain reputation reads (SBT balances, staking data, reputation score)
- EAS attestation viewer
- Staking and unstaking modals
- Import flows (Reclaim + server-assisted verification)
- AI cards for skills, review integrity, and freelancer matching

## Prerequisites

- Node.js 20+
- Running backend service
- Deployed SoulPort contracts on Base Sepolia

## Environment Variables

Copy `.env.example` to `.env` and fill values:

- `REACT_APP_API_BASE_URL`: backend base URL (e.g. `http://localhost:3001`)
- `REACT_APP_BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC endpoint
- `REACT_APP_WALLETCONNECT_PROJECT_ID`: optional for WalletConnect-based flows
- `REACT_APP_SBT_ADDRESS`: deployed SoulPortSBT address
- `REACT_APP_REPUTATION_ORACLE_ADDRESS`: deployed ReputationOracle address
- `REACT_APP_STAKING_ADDRESS`: deployed ReputationStaking address
- `REACT_APP_EAS_CONTRACT_ADDRESS`: EAS contract address (Base Sepolia: `0x4200000000000000000000000000000000000021`)
- `REACT_APP_EAS_UIDS`: comma-separated list of schema UIDs

## Install and Run

```bash
npm install
npm run start
```

Build for production:

```bash
npm run build
```

## Integration Checklist

- Backend `/api/health` is reachable from `REACT_APP_API_BASE_URL`
- Wallet is connected on Base Sepolia
- Contract addresses in `.env` match latest deployment output
- EAS UID list is non-empty for attestation viewer data

## Security Notes

- Never commit `.env` or any client secret values
- Treat all user input as untrusted; backend remains the trust boundary
- Do not expose private API keys in frontend code or env files prefixed with `REACT_APP_`
