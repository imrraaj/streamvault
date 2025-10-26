# Streaming Payment Architecture

## Contracts

### Option A: Unified stETH Vault (Recommended)

```
┌──────────────────┐
│  StETHVault      │  ← ERC4626 + ERC20 combined
│  (stETH token)   │  ← Deposit WETH, get stETH shares
└──────────────────┘  ← Redeem stETH, get WETH back

┌──────────────────┐
│  StreamPayment   │  ← Handles payments, artist earnings
└──────────────────┘  ← Burns user stETH, credits artist earnings
                      ← Artists claim → mints new stETH → redeem via vault
```

**Flow:**
1. User deposits WETH → gets stETH (vault shares)
2. User streams music → burns stETH → artist earns (internal accounting)
3. Artist claims → gets stETH minted → redeems for WETH

---

### Option B: Separate Token (Current - More Complex)

```
┌──────────────┐      ┌──────────────┐
│ StreamVault  │      │ StETH Token  │
│ (svETH)      │      │ (stETH)      │
└──────────────┘      └──────────────┘

┌──────────────────┐
│  StreamPayment   │
└──────────────────┘
```

**Problem:** Users get vault shares (svETH) but need stETH to spend. Requires extra minting logic.

---

## HTTP 402 Implementation

### Backend API

```typescript
// 1. Request stream → 402 Payment Required
GET /api/stream/:songId
Response: 402
{
  songId: "0x123...",
  artist: "0xabc...",
  pricePerSecond: "1000", // 0.001 stETH (6 decimals)
  estimatedCost3min: "180000" // 0.18 stETH
}

// 2. Start streaming session
POST /api/stream/:songId/start
→ Calls StreamPayment.startStream(songId)
Response: 200
{
  sessionId: "xyz",
  startTime: 1234567890
}

// 3. Heartbeat payment (every 30 seconds)
POST /api/stream/pay
→ Calls StreamPayment.payForStreamTime()

// 4. End stream
POST /api/stream/end
→ Calls StreamPayment.endStream()
```

### Frontend Flow

```javascript
// Check balance
const balance = await stETH.balanceOf(userAddress);

// Start stream
const tx = await streamPayment.startStream(songId);
await tx.wait();

// Periodic payment (every 30s while playing)
setInterval(async () => {
  if (isPlaying) {
    await streamPayment.payForStreamTime();
  }
}, 30000);

// On pause/end
await streamPayment.endStream();
```

---

## Pricing Models

### 1. Per-Second (Recommended for music)
```solidity
pricePerSecond = 0.000001 stETH (6 decimals: 1)
3-minute song = 180 seconds × 1 = 180 units = 0.00018 stETH
```

### 2. Per-Play Fixed
```solidity
Songs register fixed price: 0.001 stETH per play
Charge on startStream(), allow unlimited replay
```

### 3. Hybrid
```solidity
startFee = 0.0001 stETH (unlock song)
pricePerSecond = 0.0000005 stETH (continue playing)
```

### 4. Dynamic (Artist-Set)
```solidity
Each artist sets their own pricePerSecond
Popular artists charge more
New artists charge less to attract listeners
```

---

## Gas Optimization

### Problem: High gas cost per stream

**Solutions:**

1. **Batch Payments**: Pay every 30-60 seconds, not per second
2. **Superfluid Streams**: Continuous payment streams (no per-tx gas)
3. **L2 Deployment**: Base has low gas fees
4. **Account Abstraction**: Gasless txs via paymaster

---

## Security Considerations

1. **Reentrancy**: Use `ReentrancyGuard` on payment functions
2. **Artist Verification**: Implement artist registry/verification
3. **Song Ownership**: Verify artist owns song (off-chain oracle)
4. **Rate Limiting**: Prevent payment spam
5. **Emergency Pause**: Circuit breaker for exploits

---

## Implementation Recommendations

### For MVP:
- Use Option A (Unified stETH Vault)
- Per-second pricing with 30-second payment intervals
- Simple HTTP 402 with JWT tokens
- Deploy on Base Sepolia testnet

### For Production:
- Add Superfluid for gas-free streaming
- Implement artist verification oracle
- Add revenue splits for multiple rights holders
- Create dispute resolution mechanism
- Add analytics/tracking for artists
