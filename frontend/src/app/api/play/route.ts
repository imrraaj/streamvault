import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getSplits } from "@/lib/db";

const PAYMENT_CONTRACT = process.env.NEXT_PUBLIC_PAYMENT_ADDRESS as `0x${string}`;
const STETH_CONTRACT = process.env.NEXT_PUBLIC_STETH_ADDRESS as `0x${string}`;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;

const STETH_ABI = [
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const PAYMENT_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "songs",
    outputs: [
      { internalType: "address", name: "artist", type: "address" },
      { internalType: "uint256", name: "pricePerPlay", type: "uint256" },
      { internalType: "bool", name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// In-memory batch queue
const playQueue: Array<{ user: string; songId: string; timestamp: number }> = [];
let batchTimeout: NodeJS.Timeout | null = null;

async function settleBatch() {
  if (playQueue.length === 0) return;

  console.log(`Settling batch of ${playQueue.length} plays...`);

  const account = privateKeyToAccount(RELAYER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });

  for (const play of playQueue) {
    try {
      // Get song price from contract
      const songData = await publicClient.readContract({
        address: PAYMENT_CONTRACT,
        abi: PAYMENT_ABI,
        functionName: "songs",
        args: [play.songId as `0x${string}`],
      });

      const [artist, pricePerPlay, active] = songData;

      if (!active) {
        console.log(`Song ${play.songId} is not active`);
        continue;
      }

      // Check user has approved and has balance
      const [allowance, balance] = await Promise.all([
        publicClient.readContract({
          address: STETH_CONTRACT,
          abi: STETH_ABI,
          functionName: "allowance",
          args: [play.user as `0x${string}`, PAYMENT_CONTRACT],
        }),
        publicClient.readContract({
          address: STETH_CONTRACT,
          abi: STETH_ABI,
          functionName: "balanceOf",
          args: [play.user as `0x${string}`],
        }),
      ]);

      if (allowance < pricePerPlay || balance < pricePerPlay) {
        console.log(`User ${play.user} has insufficient allowance or balance`);
        continue;
      }

      // Burn tokens from user
      const burnHash = await walletClient.writeContract({
        address: STETH_CONTRACT,
        abi: STETH_ABI,
        functionName: "burn",
        args: [play.user as `0x${string}`, pricePerPlay],
      });

      console.log(`Burned ${pricePerPlay} from ${play.user} | TX: ${burnHash}`);

      // Get revenue splits from DB
      const splits = await getSplits(play.songId);

      if (splits.length > 0) {
        // Distribute to splits
        for (const split of splits) {
          const amount = (pricePerPlay * BigInt(split.percentage)) / 100n;

          const mintHash = await walletClient.writeContract({
            address: STETH_CONTRACT,
            abi: STETH_ABI,
            functionName: "mint",
            args: [split.address as `0x${string}`, amount],
          });

          console.log(
            `Minted ${amount} to ${split.role} (${split.address}) - ${split.percentage}% | TX: ${mintHash}`
          );
        }
      } else {
        // No splits, send all to artist
        const mintHash = await walletClient.writeContract({
          address: STETH_CONTRACT,
          abi: STETH_ABI,
          functionName: "mint",
          args: [artist, pricePerPlay],
        });

        console.log(`Minted ${pricePerPlay} to artist ${artist} | TX: ${mintHash}`);
      }

      console.log(`✅ Settled play: ${play.user} - ${play.songId}`);
    } catch (error) {
      console.error(`Failed to settle play for ${play.user}:`, error);
    }
  }

  playQueue.length = 0;
}

export async function POST(request: Request) {
  try {
    const { user, songId } = await request.json();

    if (!user || !songId) {
      return NextResponse.json({ error: "Missing user or songId" }, { status: 400 });
    }

    playQueue.push({ user, songId, timestamp: Date.now() });

    console.log(`Play queued: ${user} - ${songId} | Queue size: ${playQueue.length}`);

    // Settle immediately for testing (change to batch in production)
    if (playQueue.length >= 1) {
      if (batchTimeout) clearTimeout(batchTimeout);
      await settleBatch();
    } else if (!batchTimeout) {
      batchTimeout = setTimeout(async () => {
        await settleBatch();
        batchTimeout = null;
      }, 5 * 60 * 1000);
    }

    return NextResponse.json({
      success: true,
      message: "Play recorded and settled",
      queueSize: playQueue.length,
    });
  } catch (error: any) {
    console.error("Error recording play:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
