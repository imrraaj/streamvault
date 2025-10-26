# StreamVault - Local Development Setup

## Quick Start

```bash
# 1. Run setup script (installs MinIO, creates bucket)
./setup.sh

# 2. Start development server
bun dev
```

Visit http://localhost:3000

## What's Running

After running `setup.sh`:

- **Next.js App**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)
- **MinIO API**: http://localhost:9000

## MinIO Setup (Already Done!)

MinIO is configured automatically by `setup.sh`. It:
- Starts MinIO container
- Creates `music-streaming-bucket`
- Sets public read permissions
- Configures credentials in `.env.local`

## Manual MinIO Management

### Access MinIO Console

1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. View uploaded files in `music-streaming-bucket`

### MinIO CLI Commands

```bash
# List buckets
docker exec streamvault-minio mc ls local

# List files in bucket
docker exec streamvault-minio mc ls local/music-streaming-bucket

# Download a file
docker exec streamvault-minio mc cp local/music-streaming-bucket/audio/file.mp3 .

# Delete a file
docker exec streamvault-minio mc rm local/music-streaming-bucket/audio/file.mp3
```

## Testing Song Upload

### 1. Connect Wallet

- Click "Connect Wallet"
- Privy will create embedded wallet with email/social

### 2. Upload Song

- Go to "Artist Dashboard"
- Fill in:
  - Title: "Test Song"
  - Artist: "Your Name"
  - Price: 0.1 stETH
  - Upload audio file (MP3/WAV)
  - Upload cover (JPG/PNG)
- Click "Upload Song"

### 3. Verify Upload

**Check MinIO Console:**
- Visit http://localhost:9001
- Navigate to `music-streaming-bucket`
- See `audio/` and `covers/` folders with your files

**Check Browser DevTools:**
- Network tab shows successful uploads
- Console shows no errors

### 4. View in Browse Page

- Go back to home page
- Your song should appear in the list
- Click play to test (requires stETH balance)

## Environment Variables

Current `.env.local` (configured by setup):

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=cmh53wing00nlla0bwqj3cgk9

# MinIO (Local S3)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
AWS_S3_BUCKET=music-streaming-bucket
AWS_ENDPOINT=http://localhost:9000
NEXT_PUBLIC_S3_URL=http://localhost:9000

# Smart Contracts (Need to deploy first!)
NEXT_PUBLIC_STETH_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_ADDRESS=0x...
```

## Deploying Smart Contracts

Before full functionality works, deploy contracts:

```bash
cd ../vault

# Deploy to Base Sepolia
forge script script/DeployStreamVault.s.sol:DeployStreamVault \
  --rpc-url base-sepolia \
  --broadcast \
  --private-key $PRIVATE_KEY

# Copy contract addresses to frontend/.env.local
```

## Troubleshooting

### MinIO not starting

```bash
# Check if Docker is running
docker info

# Restart MinIO
docker compose down
docker compose up -d
```

### Upload fails with CORS error

```bash
# Restart MinIO (fixes CORS)
docker compose restart

# Or manually set CORS
docker exec streamvault-minio mc anonymous set download local/music-streaming-bucket
```

### Files not accessible

Files are served from: `http://localhost:9000/music-streaming-bucket/{path}`

Example: `http://localhost:9000/music-streaming-bucket/audio/1234567890-song.mp3`

### Port 3000 already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 bun dev
```

## Development Workflow

### Artist Workflow
1. Connect wallet
2. Go to Artist Dashboard
3. Upload song → Files to MinIO → Register on-chain
4. Check earnings tab
5. Claim earnings

### Listener Workflow
1. Connect wallet
2. Deposit stETH
3. Browse songs
4. Click play (auto-authorized)
5. Enjoy music!

## File Structure

```
Uploads go to MinIO:
├── audio/
│   └── {timestamp}-{filename}.mp3
└── covers/
    └── {timestamp}-{filename}.jpg

Accessible via:
http://localhost:9000/music-streaming-bucket/audio/{file}
http://localhost:9000/music-streaming-bucket/covers/{file}
```

## Production Deployment

For production, replace MinIO with AWS S3:

```env
# Production .env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...
AWS_S3_BUCKET=prod-music-bucket
# Remove AWS_ENDPOINT - uses S3 by default
```

## Cleanup

```bash
# Stop and remove MinIO
docker compose down

# Remove volumes (deletes all files)
docker compose down -v
```

## Next Steps

1. ✅ MinIO working
2. ✅ Upload API working
3. ✅ UI pages loading
4. ⏳ Deploy contracts
5. ⏳ Test full flow with real stETH

## Support

- MinIO Docs: https://min.io/docs
- Next.js Docs: https://nextjs.org/docs
- Privy Docs: https://docs.privy.io
