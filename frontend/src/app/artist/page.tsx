"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { CONTRACTS, PAYMENT_ABI, formatStETH, parseStETH } from "@/lib/contracts";
import { Upload, DollarSign, Music } from "lucide-react";
import { ethers } from "ethers";
import { RevenueSplitDialog, type Split } from "@/components/revenue-split-dialog";

export default function ArtistDashboard() {
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const [uploading, setUploading] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [revenueSplits, setRevenueSplits] = useState<Split[]>([]);

  const [songData, setSongData] = useState({
    title: "",
    artist: "",
    producer: "",
    genre: "",
    pricePerPlay: "0.1",
    description: "",
    features: "",
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // TODO: Uncomment when contracts are deployed
  // const { data: earnings } = useReadContract({
  //   address: CONTRACTS.PAYMENT,
  //   abi: PAYMENT_ABI,
  //   functionName: 'artistEarnings',
  //   args: address ? [address] : undefined,
  //   query: {
  //     refetchInterval: 10000,
  //   },
  // });
  const earnings = 0n; // Mock earnings for testing

  const handleUploadSong = async () => {
    if (!audioFile || !songData.title || !songData.artist) {
      toast({ title: "Missing required fields", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      // Upload audio to S3
      const audioUploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: audioFile.name,
          contentType: audioFile.type,
          type: "audio",
        }),
      });

      const { uploadUrl: audioUploadUrl, fileUrl: audioUrl } = await audioUploadRes.json();

      await fetch(audioUploadUrl, {
        method: "PUT",
        body: audioFile,
        headers: { "Content-Type": audioFile.type },
      });

      // Upload cover if provided
      let coverUrl = "";
      if (coverFile) {
        const coverUploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: coverFile.name,
            contentType: coverFile.type,
            type: "covers",
          }),
        });

        const { uploadUrl: coverUploadUrl, fileUrl } = await coverUploadRes.json();
        coverUrl = fileUrl;

        await fetch(coverUploadUrl, {
          method: "PUT",
          body: coverFile,
          headers: { "Content-Type": coverFile.type },
        });
      }

      // Generate song ID
      const songId = ethers.id(`${songData.title}-${Date.now()}`);

      // Register song on-chain
      const priceWei = parseStETH(songData.pricePerPlay);

      console.log('Registering song on-chain...', {
        songId,
        artist: address,
        priceWei: priceWei.toString(),
        contract: CONTRACTS.PAYMENT,
      });

      const txHash = await writeContractAsync({
        address: CONTRACTS.PAYMENT,
        abi: PAYMENT_ABI,
        functionName: "registerSong",
        args: [songId as `0x${string}`, address!, priceWei],
      });

      console.log('✅ Song registered on-chain:', songId, 'TX:', txHash);

      // Save revenue splits to database
      if (revenueSplits.length > 0) {
        await fetch("/api/splits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId, splits: revenueSplits }),
        });
      }

      // Save song metadata to backend
      const song = {
        id: songId,
        title: songData.title,
        artist: songData.artist,
        artistAddress: address,
        producer: songData.producer,
        genre: songData.genre,
        pricePerPlay: priceWei.toString(),
        audioUrl,
        coverUrl,
        description: songData.description,
        features: songData.features ? songData.features.split(",").map(f => f.trim()) : [],
        duration: 0,
        releaseDate: new Date().toISOString(),
      };

      await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(song),
      });

      toast({
        title: "Song uploaded successfully!",
        description: `${songData.title} is now available for streaming`,
      });

      // Reset form
      setSongData({
        title: "",
        artist: "",
        producer: "",
        genre: "",
        pricePerPlay: "0.1",
        description: "",
        features: "",
      });
      setAudioFile(null);
      setCoverFile(null);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClaimEarnings = async () => {
    try {
      // TODO: Uncomment when contracts are deployed
      // await writeContractAsync({
      //   address: CONTRACTS.PAYMENT,
      //   abi: PAYMENT_ABI,
      //   functionName: "claimEarnings",
      // });

      console.log('✅ Skipping on-chain claim for testing');

      toast({
        title: "Claim simulated!",
        description: "(Blockchain disabled for testing)",
      });
    } catch (error: any) {
      toast({
        title: "Claim failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <h1 className="text-3xl font-bold mb-8">Artist Dashboard</h1>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Music
            </TabsTrigger>
            <TabsTrigger value="earnings">
              <DollarSign className="h-4 w-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="songs">
              <Music className="h-4 w-4 mr-2" />
              My Songs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload New Song</CardTitle>
                <CardDescription>
                  Upload your music to start earning from streams
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Song Title *</Label>
                    <Input
                      id="title"
                      value={songData.title}
                      onChange={(e) => setSongData({ ...songData, title: e.target.value })}
                      placeholder="My Awesome Song"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artist">Artist Name *</Label>
                    <Input
                      id="artist"
                      value={songData.artist}
                      onChange={(e) => setSongData({ ...songData, artist: e.target.value })}
                      placeholder="Artist Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="producer">Producer</Label>
                    <Input
                      id="producer"
                      value={songData.producer}
                      onChange={(e) => setSongData({ ...songData, producer: e.target.value })}
                      placeholder="Producer Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Input
                      id="genre"
                      value={songData.genre}
                      onChange={(e) => setSongData({ ...songData, genre: e.target.value })}
                      placeholder="Hip-Hop, Pop, Rock, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price Per Play (stETH) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.000001"
                      value={songData.pricePerPlay}
                      onChange={(e) => setSongData({ ...songData, pricePerPlay: e.target.value })}
                      placeholder="0.1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="features">Featured Artists</Label>
                    <Input
                      id="features"
                      value={songData.features}
                      onChange={(e) => setSongData({ ...songData, features: e.target.value })}
                      placeholder="Artist1, Artist2, Artist3"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={songData.description}
                    onChange={(e) => setSongData({ ...songData, description: e.target.value })}
                    placeholder="Tell listeners about your song..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audio">Audio File *</Label>
                    <Input
                      id="audio"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover">Cover Art</Label>
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Revenue Splits</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSplitDialog(true)}
                    className="w-full"
                  >
                    {revenueSplits.length > 0
                      ? `${revenueSplits.length} Split(s) Configured`
                      : "Configure Revenue Splits (Optional)"}
                  </Button>
                  {revenueSplits.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {revenueSplits.map(s => `${s.role}: ${s.percentage}%`).join(", ")}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleUploadSong}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? "Uploading..." : "Upload Song"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Your Earnings</CardTitle>
                <CardDescription>
                  Claim your earnings from music streams
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
                  <p className="text-4xl font-bold">{formatStETH(earnings || 0n)} stETH</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ≈ ${(Number(formatStETH(earnings || 0n)) * 1).toFixed(2)} USD
                  </p>
                </div>

                <Button
                  onClick={handleClaimEarnings}
                  disabled={(earnings || 0n) === 0n}
                  className="w-full"
                >
                  Claim Earnings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="songs">
            <Card>
              <CardHeader>
                <CardTitle>My Songs</CardTitle>
                <CardDescription>
                  Manage your uploaded songs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No songs uploaded yet. Upload your first song to get started!
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <RevenueSplitDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        onSave={setRevenueSplits}
        defaultAddress={address}
      />
    </div>
  );
}
