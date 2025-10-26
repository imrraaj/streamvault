#!/bin/bash
set -e

echo "Starting Postgres..."
docker run -d --name streamvault-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16 || docker start streamvault-db

echo "Waiting for Postgres to be ready..."
sleep 3

echo "Creating database and tables..."
docker exec -i streamvault-db psql -U postgres <<EOF
CREATE DATABASE IF NOT EXISTS streamvault;
\c streamvault

CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    artist_address TEXT NOT NULL,
    producer TEXT,
    genre TEXT,
    price_per_play BIGINT NOT NULL,
    audio_url TEXT NOT NULL,
    cover_url TEXT,
    description TEXT,
    features TEXT,
    duration INTEGER,
    release_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_splits (
    id SERIAL PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id),
    recipient TEXT NOT NULL,
    percentage INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_songs_artist_address ON songs(artist_address);
CREATE INDEX IF NOT EXISTS idx_revenue_splits_song_id ON revenue_splits(song_id);
EOF

echo "Done. Postgres running on localhost:5432"
