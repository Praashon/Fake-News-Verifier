# Fake News Verifier

A blockchain-powered content verification platform that combines on-chain content registration with AI-powered fact-checking to combat misinformation.

## Overview

Fake News Verifier allows publishers to register their content on the Ethereum blockchain (Sepolia testnet), creating an immutable record of authenticity. Users can verify any news article, claim, or image against this registry and receive AI-powered analysis using multiple verification sources.

## Features

- Blockchain Content Registration: Publishers can register articles, images, and videos on-chain with metadata stored on IPFS
- AI-Powered Verification: Uses Gemini AI and Perplexity for comprehensive fact-checking and source verification
- Image/Screenshot Analysis: Upload screenshots of news articles for AI analysis and blockchain verification
- Public Ledger: Browse all registered content with filtering and search capabilities
- MetaMask Integration: Connect your wallet to register content and interact with the blockchain
- Real-time News Feed: View verified news from trusted sources registered on the platform

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Framer Motion for animations
- ethers.js for blockchain interaction

### Backend
- Node.js with ES modules
- NewsAPI integration for fetching headlines
- Automated content registration via cron jobs

### Blockchain
- Solidity smart contracts
- Hardhat development environment
- Deployed on Sepolia testnet
- IPFS via Pinata for metadata storage

## Prerequisites

- Node.js 18+
- MetaMask browser extension
- Sepolia testnet ETH (get from faucets like sepolia.dev or sepoliafaucet.com)

## Project Structure

```
Fake-News-Verifier/
├── contracts/           # Solidity smart contracts
├── scripts/             # Deployment and utility scripts
├── test/                # Contract tests
├── frontend/            # React frontend application
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       └── utils/       # Utility functions
├── backend/             # Node.js backend service
│   └── src/
│       ├── services/    # Business logic
│       └── config/      # Configuration files
└── hardhat.config.js    # Hardhat configuration
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/Fake-News-Verifier.git
cd Fake-News-Verifier
```

### 2. Install dependencies

```bash
# Root dependencies (Hardhat)
npm install

# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install
```

### 3. Configure environment variables

Copy the example environment files and fill in your API keys:

```bash
# Root .env (for Hardhat)
cp .env.example .env

# Frontend .env
cp frontend/.env.example frontend/.env

# Backend .env
cp backend/.env.example backend/.env
```

### Required API Keys

| Service | Purpose | Get it from |
|---------|---------|-------------|
| Infura | Ethereum node access | https://infura.io |
| Pinata | IPFS storage | https://app.pinata.cloud |
| Gemini | AI fact-checking | https://makersuite.google.com/app/apikey |
| Perplexity | Web search verification | https://www.perplexity.ai/settings/api |
| NewsAPI | News headlines (backend) | https://newsapi.org |
| Etherscan | Contract verification | https://etherscan.io/apis |

## Running the Application

### Frontend Development Server

```bash
cd frontend
npm run dev
```

The application will be available at http://localhost:3000

### Backend Service (Optional)

The backend service automatically fetches and registers news from trusted sources:

```bash
cd backend
npm start
```

### Smart Contract Deployment

To deploy your own instance of the contract:

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat run scripts/verify.js --network sepolia
```

## Smart Contract

The ContentVerification contract is deployed on Sepolia testnet:

**Contract Address**: `0x0cEA3E7DeF8A5E31C4ec747Ec25b998deCA48629`

### Key Functions

- `registerContent(bytes32 contentHash, string contentType, string ipfsMetadata)` - Register new content
- `verifyContent(bytes32 contentHash)` - Check if content exists and get details
- `getPublisherContent(address publisher)` - Get all content hashes for a publisher
- `searchByPartialHash(string partialHash)` - Search content by partial hash match

## Usage

### For Publishers

1. Connect your MetaMask wallet
2. Navigate to the Publish page
3. Enter your content (text or upload file)
4. Submit to register on the blockchain
5. Pay the gas fee in Sepolia ETH

### For Verification

1. Navigate to the Verify page
2. Paste the news content or upload a screenshot
3. The system will:
   - Check the blockchain registry for matches
   - Analyze content using AI models
   - Search for related fact-checks
   - Provide a verification score and detailed analysis

## Testing

```bash
# Run contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage
```

## Security Considerations

- Never commit your `.env` files or expose private keys
- The contract owner has limited admin functions (pause/unpause only)
- All content hashes are stored on-chain and cannot be modified
- IPFS metadata provides additional context but the hash is the source of truth

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
