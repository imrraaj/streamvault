export interface Song {
  id: string; // keccak256 hash
  title: string;
  artist: string;
  artistAddress: string;
  producer?: string;
  genre?: string;
  duration: number; // seconds
  pricePerPlay: string; // in stETH (6 decimals)
  coverUrl?: string;
  audioUrl: string; // S3 URL
  releaseDate: string;
  description?: string;
  features?: string[]; // featuring artists
}

export interface PlayHistory {
  songId: string;
  timestamp: number;
  amount: string;
}

export interface ArtistProfile {
  address: string;
  name: string;
  bio?: string;
  avatar?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}
