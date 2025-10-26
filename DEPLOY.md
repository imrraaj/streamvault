# Deployment Guide

## Option 1: Local Development (Anvil Fork)

1. Make Anvil fork executable and start:
```bash
cd vault
chmod +x deploy-local.sh
./deploy-local.sh
```

This will:
- Fork Base Sepolia at http://localhost:8545
- Deploy all contracts
- Output contract addresses

2. Update `frontend/.env.local` with deployed addresses:
```env
NEXT_PUBLIC_STETH_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=84532
```

3. Set relayer address (use Anvil account #1):
```bash
cast send <PAYMENT_CONTRACT> "setRelayer(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

4. Add relayer key to `frontend/.env.local`:
```env
RELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

## Option 2: Base Sepolia Testnet

1. Create `vault/.env`:
```bash
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key
```

2. Make deploy script executable and deploy:
```bash
cd vault
chmod +x deploy-testnet.sh
./deploy-testnet.sh
```

3. Update `frontend/.env.local` with deployed addresses

4. Set relayer address:
```bash
cast send <PAYMENT_CONTRACT> "setRelayer(address)" <YOUR_BACKEND_WALLET> \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

5. Add relayer private key to `frontend/.env.local`:
```env
RELAYER_PRIVATE_KEY=0x...
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

## Testing the Flow

### 1. Get stETH (via Vault)

Users need WETH first, then deposit to vault:

```bash
# Approve WETH for vault
cast send <WETH_ADDRESS> "approve(address,uint256)" <VAULT_ADDRESS> 1000000000000000000 \
  --rpc-url <RPC> --private-key <KEY>

# Deposit WETH, get stETH (1:1 ratio, 6 decimals)
cast send <VAULT_ADDRESS> "deposit(uint256,address)" 1000000000000000000 <YOUR_ADDRESS> \
  --rpc-url <RPC> --private-key <KEY>
```

### 2. Approve Spending (Seamless Model)

```bash
# Approve Payment contract to spend stETH
cast send <STETH_ADDRESS> "approve(address,uint256)" <PAYMENT_ADDRESS> 100000000 \
  --rpc-url <RPC> --private-key <KEY>

# Set spending limit (100 stETH)
cast send <PAYMENT_ADDRESS> "setSpendingLimit(uint256)" 100000000 \
  --rpc-url <RPC> --private-key <KEY>
```

### 3. Stream Music

Frontend will:
- Check `getTotalAvailable(user)` to show total balance
- Call `/api/play` when song plays
- Backend batches and settles automatically
- No per-song signing needed!

### 4. Artist Claims Earnings

```bash
cast send <PAYMENT_ADDRESS> "claimEarnings()" \
  --rpc-url <RPC> --private-key <ARTIST_KEY>
```

## Frontend Setup

1. Install dependencies:
```bash
cd frontend
bun install
```

2. Start MinIO (for music storage):
```bash
docker-compose up -d
```

3. Create bucket (first time only):
```bash
# Access MinIO at http://localhost:9001
# Login: minioadmin / minioadmin
# Create bucket: music-streaming-bucket
# Set policy to public
```

4. Start frontend:
```bash
bun run dev
```

## Flow Summary

1. **User onboarding**: Get WETH → Deposit to Vault → Get stETH
2. **One-time setup**: Approve Payment contract + Set spending limit
3. **Streaming**: Just play songs, backend handles settlement
4. **Artists**: Upload songs, earn stETH, claim anytime

No per-song transactions = seamless UX!
