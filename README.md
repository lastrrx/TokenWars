# Solana Token Betting Platform

A decentralized 1v1 token prediction platform built on Solana where users can bet on token performance.

## Project Overview
Users bet 0.1 SOL on which of two tokens (similar market cap) will perform better over a set period. Winners take 85% of the pool, platform takes 15% fee.

## Tech Stack
- **Frontend**: HTML/CSS/JavaScript with Solana wallet integration
- **Backend**: Node.js/Express with PostgreSQL
- **Smart Contracts**: Anchor/Rust on Solana
- **APIs**: Helius, Alchemy, CoinGecko, Jupiter

## Setup Instructions

### Prerequisites
- Node.js v16+ and npm
- Rust and Anchor CLI
- PostgreSQL 14+
- Solana CLI tools

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Install dependencies: `npm install`
4. Set up database: `psql -f database/schema.sql`
5. Build smart contracts: `cd smart-contracts && anchor build`

### Development
- Frontend dev: `cd frontend && npm run dev`
- Backend dev: `cd backend && npm run dev`
- Smart contracts: `cd smart-contracts && anchor test`

## Project Structure
- `frontend/` - User interface
- `admin/` - Admin panel
- `backend/` - API server
- `smart-contracts/` - Solana programs
- `database/` - SQL schemas
- `shared/` - Shared configs
- `tests/` - Test files

## Security Notes
- Admin access requires wallet + PIN
- All bets handled by smart contracts
- TWAP pricing prevents manipulation
- Platform fee automatically distributed

## Development Team
- Frontend Developer: Handles frontend/ and admin/ directories
- Backend Developer: Handles backend/ and smart-contracts/
