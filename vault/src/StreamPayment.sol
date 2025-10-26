// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./StETH.sol";

/**
 * @title StreamPayment
 * @dev Handles streaming payments, artist earnings, and revenue distribution
 */
contract StreamPayment {
    StETH public immutable stETH;

    // Artist earnings tracking (in stETH units)
    mapping(address => uint256) public artistEarnings;

    // Song metadata
    struct Song {
        address artist;
        uint256 pricePerSecond; // in stETH (6 decimals)
        bool active;
    }

    mapping(bytes32 => Song) public songs;

    // Active streaming sessions
    struct StreamSession {
        bytes32 songId;
        uint256 startTime;
        uint256 lastPaymentTime;
        bool active;
    }

    mapping(address => StreamSession) public userSessions;

    event SongRegistered(bytes32 indexed songId, address indexed artist, uint256 pricePerSecond);
    event StreamStarted(address indexed user, bytes32 indexed songId, uint256 timestamp);
    event StreamPaymentReceived(address indexed user, address indexed artist, bytes32 indexed songId, uint256 amount);
    event StreamEnded(address indexed user, bytes32 indexed songId, uint256 totalPaid);
    event ArtistClaim(address indexed artist, uint256 amount);

    constructor(StETH _stETH) {
        stETH = _stETH;
    }

    /**
     * @dev Register a song with pricing
     */
    function registerSong(bytes32 songId, address artist, uint256 pricePerSecond) external {
        require(songs[songId].artist == address(0), "Song already registered");
        require(artist != address(0), "Invalid artist");
        require(pricePerSecond > 0, "Invalid price");

        songs[songId] = Song({
            artist: artist,
            pricePerSecond: pricePerSecond,
            active: true
        });

        emit SongRegistered(songId, artist, pricePerSecond);
    }

    /**
     * @dev Start streaming a song (HTTP 402 entry point)
     */
    function startStream(bytes32 songId) external returns (uint256 estimatedCost) {
        Song memory song = songs[songId];
        require(song.active, "Song not available");
        require(!userSessions[msg.sender].active, "End current stream first");

        userSessions[msg.sender] = StreamSession({
            songId: songId,
            startTime: block.timestamp,
            lastPaymentTime: block.timestamp,
            active: true
        });

        emit StreamStarted(msg.sender, songId, block.timestamp);

        // Return estimated cost for 3 minutes
        return song.pricePerSecond * 180;
    }

    /**
     * @dev Pay for streaming time (called periodically or on end)
     */
    function payForStreamTime() external {
        StreamSession storage session = userSessions[msg.sender];
        require(session.active, "No active stream");

        Song memory song = songs[session.songId];
        uint256 secondsStreamed = block.timestamp - session.lastPaymentTime;

        if (secondsStreamed > 0) {
            uint256 amount = secondsStreamed * song.pricePerSecond;
            require(stETH.balanceOf(msg.sender) >= amount, "Insufficient stETH");

            // Burn from user
            stETH.burn(msg.sender, amount);

            // Credit artist
            artistEarnings[song.artist] += amount;

            session.lastPaymentTime = block.timestamp;

            emit StreamPaymentReceived(msg.sender, song.artist, session.songId, amount);
        }
    }

    /**
     * @dev End streaming session
     */
    function endStream() external {
        StreamSession storage session = userSessions[msg.sender];
        require(session.active, "No active stream");

        // Final payment
        this.payForStreamTime();

        uint256 totalDuration = block.timestamp - session.startTime;
        bytes32 songId = session.songId;

        session.active = false;

        emit StreamEnded(msg.sender, songId, totalDuration);
    }

    /**
     * @dev Artist claims earnings
     */
    function claimEarnings() external {
        uint256 earnings = artistEarnings[msg.sender];
        require(earnings > 0, "No earnings");

        artistEarnings[msg.sender] = 0;

        // Mint stETH to artist (they can redeem via vault)
        stETH.mint(msg.sender, earnings);

        emit ArtistClaim(msg.sender, earnings);
    }

    /**
     * @dev Get streaming cost for duration
     */
    function getStreamCost(bytes32 songId, uint256 durationSeconds) external view returns (uint256) {
        Song memory song = songs[songId];
        return song.pricePerSecond * durationSeconds;
    }

    /**
     * @dev Check user's current session status
     */
    function getCurrentSession(address user) external view returns (
        bytes32 songId,
        uint256 startTime,
        uint256 secondsPlayed,
        uint256 owedAmount
    ) {
        StreamSession memory session = userSessions[user];
        if (!session.active) {
            return (bytes32(0), 0, 0, 0);
        }

        Song memory song = songs[session.songId];
        uint256 _seconds = block.timestamp - session.lastPaymentTime;

        return (
            session.songId,
            session.startTime,
            block.timestamp - session.startTime,
            _seconds * song.pricePerSecond
        );
    }
}
