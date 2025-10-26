# StreamVault - Testing Guide (No Blockchain)

## ✅ Current State

All blockchain interactions have been **BYPASSED** for testing. You can now test the full frontend without deploying contracts!

### What's Disabled (Commented Out)
- ❌ Smart contract reads (balance checks, earnings)
- ❌ Smart contract writes (deposit, withdraw, register song, claim)
- ❌ Authorization checks for playback
- ❌ On-chain song registration

### What Works
- ✅ Privy wallet login
- ✅ Song upload to MinIO
- ✅ Song storage in API
- ✅ Browse/search songs
- ✅ Music playback
- ✅ Full UI/UX

## 🚀 Quick Start

```bash
# 1. Ensure MinIO is running
docker ps | grep minio

# 2. Start dev server (already running)
bun dev

# 3. Open browser
open http://localhost:3000
```

## 📝 Test Scenarios

### Test 1: Login with Privy

1. **Go to**: http://localhost:3000
2. **Click**: "Connect Wallet" button
3. **Privy Modal Opens**:
   - Choose login method (Email/Social/Wallet)
   - For testing: use email
4. **Expected**: Wallet connected, see address in header
5. **Expected**: Balance card shows "0.000000 stETH (Demo)"

✅ **Success**: You're logged in!

### Test 2: Upload Song as Artist

1. **Go to**: http://localhost:3000/artist
2. **Fill in form**:
   - Title: "My Test Song"
   - Artist: "Test Artist"
   - Producer: "Test Producer" (optional)
   - Genre: "Hip-Hop" (optional)
   - Price: 0.1 (default)
   - Features: "Artist2, Artist3" (optional)
   - Description: "A cool test song"
3. **Upload files**:
   - Audio: Select MP3/WAV file
   - Cover: Select JPG/PNG file
4. **Click**: "Upload Song"
5. **Expected**:
   - Files upload to MinIO (progress indicator)
   - Console log: "✅ Skipping on-chain registration for testing"
   - Success toast: "Song uploaded successfully!"
   - Form resets

✅ **Verify Upload**:
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- Check `music-streaming-bucket` → `audio/` and `covers/` folders
- See your files

### Test 3: View Uploaded Song

1. **Go back**: http://localhost:3000
2. **Expected**: Your song appears in the browse list
3. **See**:
   - Song title
   - Artist name
   - Genre
   - Price (0.1 stETH)
   - Cover image (if uploaded)

✅ **Success**: Song is browsable!

### Test 4: Play Song

1. **On browse page**, find your song
2. **Click**: Play button (or hover on card)
3. **Expected**:
   - Song starts playing immediately
   - Console log: "✅ Skipping authorization check"
   - Toast: "Now Playing: {title} - {artist}"
   - Player appears at bottom
4. **Test controls**:
   - Pause/Play
   - Seek bar
   - Volume control
   - Skip buttons (if multiple songs)

✅ **Success**: Music plays!

### Test 5: Login with Different Account

1. **Logout**: Click wallet address → Disconnect
2. **Login again** with different email/account
3. **Go to**: http://localhost:3000
4. **Expected**: See the same songs
5. **Click play**: Works without any payment!

✅ **Success**: Multi-user works!

### Test 6: Search Functionality

1. **On home page**, use search bar
2. **Try searches**:
   - Song title
   - Artist name
   - Genre
3. **Expected**: Real-time filtering works

✅ **Success**: Search works!

## 🎯 What You Should See

### Home Page
```
┌─────────────────────────────────────┐
│ StreamVault    Browse   Dashboard   │
│                   [Balance] [Wallet]│
└─────────────────────────────────────┘

  Discover Music
  Stream your favorite songs with stETH on Base

  [Search bar]

  ┌─────────────────────────────────┐
  │ [Cover] My Test Song            │
  │         Test Artist             │
  │         Hip-Hop     0.1 stETH   │
  └─────────────────────────────────┘

┌─────────────────────────────────────┐
│ [◄] [►] [⏸] [━━━━━━━━━━━] 🔊 0.1  │
│     0:00 / 3:45                     │
└─────────────────────────────────────┘
```

### Artist Dashboard
```
┌─────────────────────────────────────┐
│ StreamVault                         │
└─────────────────────────────────────┘

  Artist Dashboard

  [Upload]  [Earnings]  [My Songs]

  Upload New Song

  [Title input]
  [Artist input]
  [Producer input]
  [Genre input]
  [Price input]
  [Features input]
  [Description input]

  [Audio file picker]
  [Cover file picker]

  [Upload Song]
```

## 🔍 Debugging

### Song not appearing after upload?

Check browser console:
```javascript
✅ Skipping on-chain registration for testing
// Should see this log
```

Check Network tab:
- POST /api/upload (200) ✅
- POST /api/songs (200) ✅

### Can't play song?

Check console:
```javascript
✅ Skipping authorization check - playing freely for testing
```

Check audio source:
- Should be: `http://localhost:9000/music-streaming-bucket/audio/{file}`

### Upload fails?

Check MinIO:
```bash
# Is MinIO running?
docker ps | grep minio

# Restart if needed
docker compose restart
```

## 📊 Console Logs to Expect

When everything works, you'll see:
```
✅ Skipping on-chain registration for testing
✅ Skipping authorization check - playing freely for testing
```

## 🎨 UI Features to Test

### Balance Card
- Shows "0.000000 stETH (Demo)"
- "Blockchain disabled" text
- Deposit/Withdraw buttons disabled

### Player
- Plays audio from MinIO
- All controls work
- Shows song metadata
- Progress bar moves
- Volume control works

### Upload Form
- All fields work
- File pickers work
- Upload progress shows
- Success/error toasts

## 🐛 Known Limitations

### Without Blockchain:
- ❌ No real balance tracking
- ❌ No earnings accumulation
- ❌ No payment required (free playback)
- ❌ Songs only in memory (lost on server restart)

### These are EXPECTED and OK for testing!

## ✨ Re-enabling Blockchain

When ready to use real contracts:

1. **Deploy contracts** (see vault/README.md)
2. **Update .env.local** with contract addresses
3. **Find all TODO comments** in code:
   ```bash
   grep -r "TODO: Uncomment when contracts" src/
   ```
4. **Uncomment** the contract interaction code
5. **Comment out** the mock values

Files to update:
- `src/app/artist/page.tsx`
- `src/components/music-player.tsx`
- `src/components/balance-card.tsx`

## 📈 Success Metrics

After testing, you should have:
- ✅ Logged in with Privy
- ✅ Uploaded at least 1 song
- ✅ Seen song in browse page
- ✅ Played song successfully
- ✅ Tested with 2+ accounts
- ✅ Verified files in MinIO

## 🎉 Next Steps

1. Test all scenarios above
2. Upload multiple songs
3. Try different file types
4. Test edge cases (large files, long titles)
5. When ready: Deploy contracts and re-enable blockchain!

## 💡 Tips

- Use Chrome DevTools for debugging
- Check Network tab for API calls
- Check Console for logs
- Check MinIO console for files
- Test on different browsers
- Try incognito mode for multi-user testing

## ⚠️ Important Notes

1. **Data is temporary**: Songs stored in memory, lost on server restart
2. **MinIO is local**: Files deleted if you run `docker compose down -v`
3. **Free playback**: No payment required (this is intentional for testing)
4. **Mock balances**: All balance displays are fake

This is **perfect for frontend testing** before blockchain is ready!
