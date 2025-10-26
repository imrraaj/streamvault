import { NextRequest, NextResponse } from 'next/server';

// Mock songs data - replace with actual database
const mockSongs = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const song = mockSongs.get(id);

  if (!song) {
    return NextResponse.json(
      { error: 'Song not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ song });
}
