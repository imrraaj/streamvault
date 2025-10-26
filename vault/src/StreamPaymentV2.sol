// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./StETH.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StreamPaymentV2
 * @dev Seamless pay-per-stream with dual payment models:
 * 1. Approval-based: User approves once, backend pulls payment automatically
 * 2. Pre-deposit: User deposits, backend deducts from balance
 * Backend tracks plays, settles in batches for gas efficiency
 */
contract StreamPaymentV2 is Ownable, ReentrancyGuard {
    StETH public immutable stETH;

    // User balances in contract (deposited stETH)
    mapping(address => uint256) public userBalances;

    // Artist earnings
    mapping(address => uint256) public artistEarnings;

    // Song metadata
    struct Song {
        address artist;
        uint256 pricePerPlay; // Fixed price in stETH (6 decimals)
        bool active;
    }
    mapping(bytes32 => Song) public songs;

    // Play tracking (on-chain record)
    mapping(address => mapping(bytes32 => uint256)) public playCount;

    // Backend relayer for batch settlements
    address public relayer;

    // Spending limits for approval-based payments
    mapping(address => uint256) public spendingLimits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event SongRegistered(bytes32 indexed songId, address indexed artist, uint256 pricePerPlay);
    event PlaySettled(address indexed user, address indexed artist, bytes32 indexed songId, uint256 amount);
    event PlaySettledFromWallet(address indexed user, address indexed artist, bytes32 indexed songId, uint256 amount);
    event ArtistClaim(address indexed artist, uint256 amount);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event SpendingLimitSet(address indexed user, uint256 limit);

    constructor(StETH _stETH) Ownable(msg.sender) {
        stETH = _stETH;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer");
        _;
    }

    /**
     * @dev Set relayer address (backend service)
     */
    function setRelayer(address _relayer) external onlyOwner {
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }

    /**
     * @dev User deposits stETH for streaming (one-time approval)
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(stETH.balanceOf(msg.sender) >= amount, "Insufficient balance");

        stETH.burn(msg.sender, amount);
        userBalances[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev User withdraws unused balance
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");

        userBalances[msg.sender] -= amount;
        stETH.mint(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Register song with price
     */
    function registerSong(bytes32 songId, address artist, uint256 pricePerPlay) external {
        require(songs[songId].artist == address(0), "Song exists");
        require(artist != address(0), "Invalid artist");
        require(pricePerPlay > 0, "Invalid price");

        songs[songId] = Song({
            artist: artist,
            pricePerPlay: pricePerPlay,
            active: true
        });

        emit SongRegistered(songId, artist, pricePerPlay);
    }

    /**
     * @dev Set spending limit for approval-based payments
     * User approves stETH spending once, sets limit here
     */
    function setSpendingLimit(uint256 limit) external {
        require(limit > 0, "Limit must be > 0");
        spendingLimits[msg.sender] = limit;
        emit SpendingLimitSet(msg.sender, limit);
    }

    /**
     * @dev Settle play payment from user's deposited balance
     * @param user User who played the song
     * @param songId Song ID
     */
    function settlePlay(address user, bytes32 songId) external onlyRelayer nonReentrant {
        Song memory song = songs[songId];
        require(song.active, "Song not active");
        require(userBalances[user] >= song.pricePerPlay, "Insufficient user balance");

        // Deduct from user
        userBalances[user] -= song.pricePerPlay;

        // Credit artist
        artistEarnings[song.artist] += song.pricePerPlay;

        // Track play
        playCount[user][songId]++;

        emit PlaySettled(user, song.artist, songId, song.pricePerPlay);
    }

    /**
     * @dev Settle play payment directly from user's wallet (approval-based)
     * More seamless: user approves once, backend pulls payment automatically
     * @param user User who played the song
     * @param songId Song ID
     */
    function settlePlayFromWallet(address user, bytes32 songId) external onlyRelayer nonReentrant {
        Song memory song = songs[songId];
        require(song.active, "Song not active");

        // Check spending limit
        require(spendingLimits[user] >= song.pricePerPlay, "Spending limit exceeded");

        // Check stETH balance
        require(stETH.balanceOf(user) >= song.pricePerPlay, "Insufficient stETH balance");

        // Check allowance
        require(stETH.allowance(user, address(this)) >= song.pricePerPlay, "Insufficient allowance");

        // Burn from user wallet
        stETH.burn(user, song.pricePerPlay);

        // Credit artist
        artistEarnings[song.artist] += song.pricePerPlay;

        // Decrease spending limit
        spendingLimits[user] -= song.pricePerPlay;

        // Track play
        playCount[user][songId]++;

        emit PlaySettledFromWallet(user, song.artist, songId, song.pricePerPlay);
    }

    /**
     * @dev Batch settle multiple plays from deposited balances (gas efficient)
     */
    function settleBatch(address[] calldata users, bytes32[] calldata songIds) external onlyRelayer {
        require(users.length == songIds.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            this.settlePlay(users[i], songIds[i]);
        }
    }

    /**
     * @dev Batch settle multiple plays from user wallets (approval-based, most seamless)
     */
    function settleBatchFromWallet(address[] calldata users, bytes32[] calldata songIds) external onlyRelayer {
        require(users.length == songIds.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            // Try to settle from wallet, skip if insufficient
            Song memory song = songs[songIds[i]];
            if (song.active &&
                spendingLimits[users[i]] >= song.pricePerPlay &&
                stETH.balanceOf(users[i]) >= song.pricePerPlay &&
                stETH.allowance(users[i], address(this)) >= song.pricePerPlay) {

                this.settlePlayFromWallet(users[i], songIds[i]);
            }
        }
    }

    /**
     * @dev Artist claims earnings
     */
    function claimEarnings() external nonReentrant {
        uint256 earnings = artistEarnings[msg.sender];
        require(earnings > 0, "No earnings");

        artistEarnings[msg.sender] = 0;
        stETH.mint(msg.sender, earnings);

        emit ArtistClaim(msg.sender, earnings);
    }

    /**
     * @dev Check if user can afford song (checks both deposit and wallet balance)
     */
    function canPlay(address user, bytes32 songId) external view returns (bool) {
        Song memory song = songs[songId];
        if (!song.active) return false;

        // Can pay from deposited balance
        if (userBalances[user] >= song.pricePerPlay) return true;

        // Can pay from wallet (approval-based)
        if (spendingLimits[user] >= song.pricePerPlay &&
            stETH.balanceOf(user) >= song.pricePerPlay &&
            stETH.allowance(user, address(this)) >= song.pricePerPlay) {
            return true;
        }

        return false;
    }

    /**
     * @dev Get user's total available balance (deposit + wallet approval)
     */
    function getTotalAvailable(address user) external view returns (uint256) {
        uint256 deposited = userBalances[user];
        uint256 approved = stETH.allowance(user, address(this));
        uint256 wallet = stETH.balanceOf(user);
        uint256 limit = spendingLimits[user];

        // Available from wallet is minimum of: allowance, balance, and spending limit
        uint256 walletAvailable = approved < wallet ? approved : wallet;
        walletAvailable = walletAvailable < limit ? walletAvailable : limit;

        return deposited + walletAvailable;
    }

    /**
     * @dev Get user's play history
     */
    function getUserPlays(address user, bytes32 songId) external view returns (uint256) {
        return playCount[user][songId];
    }

    /**
     * @dev Toggle song active status
     */
    function setSongActive(bytes32 songId, bool active) external {
        require(songs[songId].artist == msg.sender, "Not artist");
        songs[songId].active = active;
    }
}
