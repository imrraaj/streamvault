import { NextResponse } from "next/server";
import { saveSplits, getSplits, createSplitsTable } from "@/lib/db";

// Initialize table on first request
let tableInitialized = false;

async function ensureTable() {
  if (!tableInitialized) {
    await createSplitsTable();
    tableInitialized = true;
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();

    const { songId, splits } = await request.json();

    if (!songId || !splits || !Array.isArray(splits)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Validate splits
    const total = splits.reduce((sum: number, s: any) => sum + s.percentage, 0);
    if (total !== 100) {
      return NextResponse.json(
        { error: "Split percentages must total 100%" },
        { status: 400 }
      );
    }

    await saveSplits(splits.map((s: any) => ({
      ...s,
      songId,
    })));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving splits:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");

    if (!songId) {
      return NextResponse.json(
        { error: "Missing songId" },
        { status: 400 }
      );
    }

    const splits = await getSplits(songId);

    return NextResponse.json({ splits });
  } catch (error: any) {
    console.error("Error fetching splits:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
