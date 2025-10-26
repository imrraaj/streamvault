"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";
import { Song } from "@/types/song";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { CONTRACTS, PAYMENT_ABI, STETH_ABI, formatStETH } from "@/lib/contracts";
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";

interface MusicPlayerProps {
  song: Song;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function MusicPlayer({ song, onNext, onPrevious }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAuthorized, setHasAuthorized] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

  // Check user's stETH balance
  const { data: stETHBalance } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Check allowance to payment contract
  const { data: allowance } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.PAYMENT] : undefined,
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onNext?.();
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onNext]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !address) return;

    if (!hasPaid && !isPlaying) {
      // User must sign transaction to pay for this play
      const pricePerPlay = BigInt(song.pricePerPlay);
      const userBalance = stETHBalance || 0n;

      if (userBalance < pricePerPlay) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${formatStETH(pricePerPlay)} stETH to play this song`,
          variant: "destructive",
        });
        return;
      }

      try {
        toast({
          title: "Payment Required",
          description: `Please sign to pay ${formatStETH(pricePerPlay)} stETH`,
        });

        // User directly transfers stETH to payment contract (requires signature every time)
        await writeContractAsync({
          address: CONTRACTS.STETH,
          abi: STETH_ABI,
          functionName: "transfer",
          args: [CONTRACTS.PAYMENT, pricePerPlay],
        });

        // Call backend to distribute payment to artist/splits
        const response = await fetch("/api/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: address,
            songId: ethers.id(song.id),
          }),
        });

        if (!response.ok) {
          throw new Error("Payment distribution failed");
        }

        setHasPaid(true);
        audioRef.current.src = song.audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);

        toast({
          title: "Now Playing",
          description: `${song.title} - ${song.artist}`,
        });
      } catch (error: any) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "User rejected transaction",
          variant: "destructive",
        });
      }
    } else {
      // Toggle play/pause
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="container fixed bottom-0 mb-4 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-[200px]">
            {song.coverUrl && (
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{song.title}</p>
              <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={onPrevious}
                disabled={!onPrevious}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-10 w-10"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onNext}
                disabled={!onNext}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-full flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume & Price */}
          <div className="flex items-center gap-4 min-w-[200px] justify-end">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(v) => setVolume(v[0] / 100)}
                className="w-20"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatStETH(BigInt(song.pricePerPlay))} stETH
            </div>
          </div>
        </div>

        <audio ref={audioRef} />
      </CardContent>
    </Card>
  );
}
