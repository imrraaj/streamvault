"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { SongCard } from "@/components/song-card";
import { MusicPlayer } from "@/components/music-player";
import { Song } from "@/types/song";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch songs from API
    fetch("/api/songs")
      .then((res) => res.json())
      .then((data) => {
        setSongs(data.songs || []);
        setFilteredSongs(data.songs || []);
      })
      .catch((error) => console.error("Failed to fetch songs:", error));
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredSongs(songs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.genre?.toLowerCase().includes(query)
    );
    setFilteredSongs(filtered);
  }, [searchQuery, songs]);

  const handlePlay = (song: Song) => {
    setCurrentSong(song);
  };

  const handleNext = () => {
    if (!currentSong) return;
    const currentIndex = filteredSongs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex < filteredSongs.length - 1) {
      setCurrentSong(filteredSongs[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!currentSong) return;
    const currentIndex = filteredSongs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(filteredSongs[currentIndex - 1]);
    }
  };

  return (
    <div className="container mx-auto min-h-screen bg-background pb-32">
      <Header />
      <main className="py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Music</h1>
          <p className="text-muted-foreground">
            Stream your favorite songs with stETH on Base
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search songs, artists, or genres..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No songs found matching your search" : "No songs available yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {!searchQuery && "Artists can upload songs from the Artist Dashboard"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={() => handlePlay(song)}
              />
            ))}
          </div>
        )}
      </main>

      {currentSong && (
        <MusicPlayer
          song={currentSong}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </div>
  );
}
