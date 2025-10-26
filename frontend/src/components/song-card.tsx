"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Song } from "@/types/song";
import { formatStETH } from "@/lib/contracts";

interface SongCardProps {
  song: Song;
  onPlay: () => void;
}

export function SongCard({ song, onPlay }: SongCardProps) {
  return (
    <Card className="group cursor-pointer hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-16 h-16 rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-primary/20 flex items-center justify-center">
                <Play className="h-6 w-6" />
              </div>
            )}
            <Button
              size="icon"
              className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onPlay}
            >
              <Play className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{song.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
            {song.features && song.features.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                feat. {song.features.join(", ")}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {formatStETH(BigInt(song.pricePerPlay))} stETH
            </p>
            {song.genre && (
              <p className="text-xs text-muted-foreground">{song.genre}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
