import { NextRequest, NextResponse } from 'next/server';
import { Song } from '@/types/song';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/streamvault',
});

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM songs ORDER BY created_at DESC');
    const songs: Song[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      artistAddress: row.artist_address,
      producer: row.producer,
      genre: row.genre,
      pricePerPlay: row.price_per_play,
      audioUrl: row.audio_url,
      coverUrl: row.cover_url,
      description: row.description,
      features: row.features || [],
      duration: row.duration,
      releaseDate: row.release_date,
    }));
    return NextResponse.json({ songs });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const song: Song = await request.json();

    // Validate required fields
    if (!song.id || !song.title || !song.artistAddress || !song.pricePerPlay || !song.audioUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check if song already exists
      const existsResult = await client.query('SELECT id FROM songs WHERE id = $1', [song.id]);
      if (existsResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Song already exists' },
          { status: 409 }
        );
      }

      // Insert song
      await client.query(
        `INSERT INTO songs (id, title, artist, artist_address, producer, genre, price_per_play, audio_url, cover_url, description, features, duration, release_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          song.id,
          song.title,
          song.artist,
          song.artistAddress,
          song.producer,
          song.genre,
          song.pricePerPlay,
          song.audioUrl,
          song.coverUrl,
          song.description,
          song.features || [],
          song.duration,
          song.releaseDate,
        ]
      );

      return NextResponse.json({ success: true, song });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Song creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create song' },
      { status: 500 }
    );
  }
}
