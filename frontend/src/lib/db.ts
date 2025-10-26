import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/streamvault',
});

export interface RevenueSplit {
  songId: string;
  address: string;
  percentage: number;
  role: string;
}

export async function createSplitsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_splits (
        id SERIAL PRIMARY KEY,
        song_id VARCHAR(66) NOT NULL,
        address VARCHAR(42) NOT NULL,
        percentage INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}

export async function saveSplits(splits: RevenueSplit[]) {
  const client = await pool.connect();
  try {
    for (const split of splits) {
      await client.query(
        `INSERT INTO revenue_splits (song_id, address, percentage, role)
         VALUES ($1, $2, $3, $4)`,
        [split.songId, split.address, split.percentage, split.role]
      );
    }
  } finally {
    client.release();
  }
}

export async function getSplits(songId: string): Promise<RevenueSplit[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT song_id as "songId", address, percentage, role
       FROM revenue_splits
       WHERE song_id = $1`,
      [songId]
    );
    return result.rows as RevenueSplit[];
  } finally {
    client.release();
  }
}
