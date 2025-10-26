#!/bin/bash

# Check if .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Copy .env.example and fill in your values"
  exit 1
fi

# Load environment variables
source .env

# Deploy to Base Sepolia
echo "Deploying contracts to Base Sepolia..."
forge script script/DeployStreamVault.s.sol:DeployStreamVault \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvv

echo ""
echo "=== Deployment Complete ==="
echo "Update frontend/.env.local with contract addresses above"
echo ""
echo "Next steps:"
echo "1. Copy addresses to frontend/.env.local"
echo "2. Set relayer: cast send <PAYMENT_ADDRESS> \"setRelayer(address)\" <YOUR_BACKEND_WALLET> --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY"
