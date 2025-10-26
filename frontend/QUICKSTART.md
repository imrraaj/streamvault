# StreamVault Frontend - Quick Start

## Installation

```bash
npm install
# or
bun install
```

## Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with:
- Privy App ID (from dashboard.privy.io)
- Contract addresses (from vault deployment)
- AWS credentials (for S3 uploads)

## Run Development

```bash
npm run dev
```

Visit http://localhost:3000

## Key Features

### Wallet Connection (Privy)
- Embedded wallets for users without crypto wallet
- Email/social login supported
- Multi-chain support (Base Sepolia)

### Music Streaming
- Browse songs with search/filter
- Play without signing per song (pre-deposit model)
- Beautiful player with controls

### Artist Dashboard
- Upload songs with metadata
- Set pricing per play
- Track and claim earnings
- S3 integration for audio/covers

### Payment System
- Deposit stETH once
- Stream unlimited songs
- Batch settlements (gas efficient)
- Withdraw anytime

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── artist/        # Artist dashboard
│   ├── layout.tsx     # Root with Privy
│   └── page.tsx       # Browse/home
├── components/
│   ├── ui/            # shadcn components
│   ├── header.tsx     # Navigation
│   ├── music-player.tsx
│   ├── balance-card.tsx
│   └── ...
├── lib/
│   ├── contracts.ts   # ABIs & helpers
│   └── config.ts      # wagmi setup
└── types/
    └── song.ts        # TypeScript types
```

## Usage

### As Listener
1. Connect wallet
2. Deposit stETH
3. Browse & play songs
4. Withdraw unused balance

### As Artist
1. Connect wallet
2. Go to Artist Dashboard
3. Upload song with metadata
4. Set price & register on-chain
5. Claim earnings

## Tech Stack

- Next.js 16 + React 19
- Privy (wallet auth)
- wagmi + viem (blockchain)
- shadcn/ui + Tailwind CSS
- AWS S3 (storage)
- Base Sepolia

## Troubleshooting

**Build errors?**
```bash
rm -rf .next node_modules
npm install
npm run dev
```

**TypeScript errors?**
Check all env variables are set in `.env.local`

**Privy not connecting?**
Verify App ID and Base Sepolia is added to your Privy app

**S3 uploads failing?**
Check AWS credentials and bucket CORS configuration

## Next Steps

- See [SETUP.md](../SETUP.md) for detailed deployment guide
- See [vault/README](../vault/README.md) for contract info
- Join Discord for support

## License

MIT
