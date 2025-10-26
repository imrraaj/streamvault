# StreamVault - Decentralized Music Streaming Smart Contracts

Pay-per-stream music platform with **seamless user experience**. Users approve once, stream unlimited songs without signing transactions.

## 🎯 Key Features

- **Dual Payment Models**: Approval-based (seamless) + Pre-deposit (optional)
- **Approve Once, Stream Forever**: No transaction signing per song
- **Gas Efficient**: Batch settlement of payments off-chain
- **Artist Earnings**: Direct on-chain earnings with instant claim
- **Spending Limits**: User-controlled spending caps for safety

## 📁 Contracts

### StETH.sol
ERC20 token with 6 decimals (like USDC) for streaming payments.
- Mintable/burnable by owner (StreamPaymentV2)
- Supports approval mechanism for seamless payments
- Users can burn their own tokens

### StreamVault.sol
ERC4626 vault for WETH ↔ stETH conversion (future enhancement).

### StreamPaymentV2.sol
Core payment logic with **two payment modes**:

**Mode 1: Approval-Based (Recommended - Most Seamless)**
1. User approves stETH spending to contract
2. User sets spending limit (e.g., 10 stETH)
3. Backend pulls payment automatically when streaming
4. No signing per song!

**Mode 2: Pre-Deposit**
1. User deposits stETH into contract
2. Balance tracked on-chain
3. Backend deducts from balance
4. User can withdraw unused anytime

## 🚀 Deployment Guide

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone repo
git clone <repo>
cd vault

# Install dependencies
forge install
```

### Step 1: Environment Setup

Create `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Add to `.env`:
```env
# Deployer private key (DO NOT COMMIT!)
PRIVATE_KEY=0x...

# Base Sepolia RPC
RPC_URL=https://sepolia.base.org

# Basescan API key (for verification)
BASESCAN_API_KEY=your_api_key

# Backend relayer address (will settle payments)
RELAYER_ADDRESS=0x...
```

### Step 2: Get Test Funds

```bash
# Get Base Sepolia ETH from faucet
# Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

# Or use cast
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL
```

### Step 3: Compile Contracts

```bash
# Compile
forge build

# Check for errors
forge build --sizes
```

Expected output:
```
Compiling 3 files with 0.8.13
Compilation successful!
```

### Step 4: Deploy to Base Sepolia

```bash
# Load environment
source .env

# Deploy contracts
forge script script/DeployStreamVault.s.sol:DeployStreamVault \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Expected Output:**
```
== Logs ==
StETH deployed at: 0x1234...
StreamVault deployed at: 0x5678...
StreamPaymentV2 deployed at: 0x9abc...
StETH ownership transferred to StreamPaymentV2

=== Deployment Summary ===
1. Users get stETH from StreamVault (WETH -> stETH)
2. Users deposit stETH into StreamPaymentV2 once
3. Backend authorizes plays via HTTP 402
4. Settlements batched on-chain every 5 minutes
5. Artists claim earnings from StreamPaymentV2

Don't forget to set relayer address:
  payment.setRelayer(<backend_wallet_address>)
```

### Step 5: Set Relayer Address

```bash
# Set backend wallet as relayer (can settle payments)
cast send $PAYMENT_ADDRESS \
  "setRelayer(address)" $RELAYER_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Verify
cast call $PAYMENT_ADDRESS \
  "relayer()(address)" \
  --rpc-url $RPC_URL
```

### Step 6: Verify Deployment

```bash
# Check StETH
cast call $STETH_ADDRESS \
  "owner()(address)" \
  --rpc-url $RPC_URL
# Should return StreamPaymentV2 address

# Check decimals
cast call $STETH_ADDRESS \
  "decimals()(uint8)" \
  --rpc-url $RPC_URL
# Should return 6

# Check relayer
cast call $PAYMENT_ADDRESS \
  "relayer()(address)" \
  --rpc-url $RPC_URL
# Should return your backend address
```

### Step 7: Update Frontend

Copy contract addresses to frontend `.env.local`:

```bash
cd ../frontend

# Update .env.local
nano .env.local
```

Add:
```env
NEXT_PUBLIC_STETH_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_ADDRESS=0x...
```

## 🎵 User Flow

### For Listeners (Seamless Experience)

**Setup (One-Time)**
```bash
# 1. Get stETH (from vault or direct purchase)
cast send $STETH_ADDRESS \
  "approve(address,uint256)" \
  $PAYMENT_ADDRESS \
  1000000000 \
  --rpc-url $RPC_URL \
  --private-key $USER_KEY

# 2. Set spending limit (e.g., 10 stETH)
cast send $PAYMENT_ADDRESS \
  "setSpendingLimit(uint256)" \
  10000000 \
  --rpc-url $RPC_URL \
  --private-key $USER_KEY
```

**Streaming (No More Signatures!)**
1. Open app, browse songs
2. Click play
3. Backend calls `settlePlayFromWallet(user, songId)`
4. Payment deducted automatically
5. Continue streaming seamlessly!

### For Artists

**Upload Song**
```bash
# Register song on-chain
cast send $PAYMENT_ADDRESS \
  "registerSong(bytes32,address,uint256)" \
  $SONG_ID \
  $ARTIST_ADDRESS \
  100000 \
  --rpc-url $RPC_URL \
  --private-key $ARTIST_KEY
# 100000 = 0.1 stETH per play
```

**Claim Earnings**
```bash
# Check earnings
cast call $PAYMENT_ADDRESS \
  "artistEarnings(address)(uint256)" \
  $ARTIST_ADDRESS \
  --rpc-url $RPC_URL

# Claim to wallet
cast send $PAYMENT_ADDRESS \
  "claimEarnings()" \
  --rpc-url $RPC_URL \
  --private-key $ARTIST_KEY
```

### For Backend (Relayer)

**Settle Plays**
```bash
# Single settlement
cast send $PAYMENT_ADDRESS \
  "settlePlayFromWallet(address,bytes32)" \
  $USER_ADDRESS \
  $SONG_ID \
  --rpc-url $RPC_URL \
  --private-key $RELAYER_KEY

# Batch settlement (gas efficient)
cast send $PAYMENT_ADDRESS \
  "settleBatchFromWallet(address[],bytes32[])" \
  "[$USER1,$USER2,$USER3]" \
  "[$SONG1,$SONG2,$SONG3]" \
  --rpc-url $RPC_URL \
  --private-key $RELAYER_KEY
```

## 🧪 Testing Locally

### Start Local Chain

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy to local
forge script script/DeployStreamVault.s.sol:DeployStreamVault \
  --fork-url http://localhost:8545 \
  --broadcast
```

### Run Tests

```bash
# Run all tests
forge test

# Run with gas report
forge test --gas-report

# Run specific test
forge test --match-test testSettlePlay -vvv

# Coverage
forge coverage
```

## 📊 Contract Interactions

### Check User Balance

```bash
# Deposited balance
cast call $PAYMENT_ADDRESS \
  "userBalances(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $RPC_URL

# Spending limit
cast call $PAYMENT_ADDRESS \
  "spendingLimits(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $RPC_URL

# Total available (deposit + approved)
cast call $PAYMENT_ADDRESS \
  "getTotalAvailable(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $RPC_URL

# Can play song?
cast call $PAYMENT_ADDRESS \
  "canPlay(address,bytes32)(bool)" \
  $USER_ADDRESS \
  $SONG_ID \
  --rpc-url $RPC_URL
```

### Song Management

```bash
# Get song info
cast call $PAYMENT_ADDRESS \
  "songs(bytes32)(address,uint256,bool)" \
  $SONG_ID \
  --rpc-url $RPC_URL

# Toggle song active status (artist only)
cast send $PAYMENT_ADDRESS \
  "setSongActive(bytes32,bool)" \
  $SONG_ID \
  false \
  --rpc-url $RPC_URL \
  --private-key $ARTIST_KEY

# Get play count
cast call $PAYMENT_ADDRESS \
  "playCount(address,bytes32)(uint256)" \
  $USER_ADDRESS \
  $SONG_ID \
  --rpc-url $RPC_URL
```

## 🔐 Security

### Owner Functions (Admin Only)
- `setRelayer(address)` - Set backend relayer

### Relayer Functions (Backend Only)
- `settlePlay(address, bytes32)` - Settle from deposit
- `settlePlayFromWallet(address, bytes32)` - Settle from wallet
- `settleBatch(address[], bytes32[])` - Batch from deposits
- `settleBatchFromWallet(address[], bytes32[])` - Batch from wallets

### User Functions
- `deposit(uint256)` - Deposit stETH
- `withdraw(uint256)` - Withdraw from deposit
- `setSpendingLimit(uint256)` - Set approval spending limit
- `claimEarnings()` - Artist claims earnings (artist only)

### Artist Functions
- `registerSong(bytes32, address, uint256)` - Register new song
- `setSongActive(bytes32, bool)` - Toggle song status

## ⚡ Gas Optimization

### Batch Settlements

```bash
# Instead of 100 individual transactions:
# 100 tx × 80,000 gas = 8,000,000 gas

# Use batch settlement:
# 1 tx × 500,000 gas = 500,000 gas
# Saves 93.75% gas!
```

### Approval-Based vs Pre-Deposit

**Approval-Based (Recommended)**
- User signs once (approve + setSpendingLimit)
- Backend settles freely
- Most seamless UX

**Pre-Deposit**
- User deposits upfront
- Faster settlement (no allowance checks)
- Good for power users

## 🐛 Troubleshooting

### Deployment fails

```bash
# Check balance
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL

# Check gas price
cast gas-price --rpc-url $RPC_URL

# Try with higher gas
forge script ... --gas-price 2000000000
```

### Verification fails

```bash
# Manual verification
forge verify-contract \
  $CONTRACT_ADDRESS \
  src/StreamPaymentV2.sol:StreamPaymentV2 \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $STETH_ADDRESS)
```

### Transaction reverts

```bash
# Simulate transaction
cast call $CONTRACT_ADDRESS \
  "functionName(args)" \
  --rpc-url $RPC_URL

# Check error
cast call ... || echo "Error occurred"

# Use cast send with --trace
cast send ... --trace
```

## 📚 Additional Resources

- **Foundry Book**: https://book.getfoundry.sh
- **Base Docs**: https://docs.base.org
- **Basescan**: https://sepolia.basescan.org

## 🎉 Production Deployment

Same steps as Sepolia, but use:
- **RPC**: https://mainnet.base.org
- **Chain ID**: 8453
- **Explorer**: https://basescan.org

```bash
forge script script/DeployStreamVault.s.sol:DeployStreamVault \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## 📝 Notes

- Always test on Sepolia first
- Keep private keys secure (use hardware wallet in prod)
- Monitor relayer balance for gas
- Set reasonable spending limits for users
- Batch settlements every 5-10 minutes for optimal gas efficiency
