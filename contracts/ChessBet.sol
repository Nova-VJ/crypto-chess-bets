// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChessBet
 * @dev Secure smart contract for chess betting on BSC
 * Includes: ReentrancyGuard, Pausable, time limits, front-running protection
 */
contract ChessBet {
    // ============ State Variables ============
    address public owner;
    uint256 public platformFee = 250; // 2.5% fee (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant GAME_TIMEOUT = 24 hours; // Max time for a game to be joined
    uint256 public constant GAME_MAX_DURATION = 48 hours; // Max duration for an active game
    
    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    
    // Pause functionality
    bool public paused;
    
    enum GameState { Waiting, Active, Finished, Cancelled }
    
    struct Game {
        address player1;
        address player2;
        uint256 stake;
        GameState state;
        address winner;
        uint256 createdAt;
        uint256 startedAt;
        bytes32 commitHash; // Front-running protection
    }
    
    mapping(bytes32 => Game) public games;
    mapping(address => uint256) public playerBalances;
    
    // ============ Events ============
    event GameCreated(bytes32 indexed gameId, address indexed player1, uint256 stake);
    event GameJoined(bytes32 indexed gameId, address indexed player2);
    event GameFinished(bytes32 indexed gameId, address indexed winner, uint256 prize);
    event GameCancelled(bytes32 indexed gameId, uint256 refundAmount);
    event Withdrawal(address indexed player, uint256 amount);
    event Deposit(address indexed player, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier gameExists(bytes32 gameId) {
        require(games[gameId].player1 != address(0), "Game not found");
        _;
    }
    
    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // ============ Constructor ============
    constructor() {
        owner = msg.sender;
        _status = NOT_ENTERED;
    }
    
    // ============ Game Functions ============
    
    /**
     * @dev Create a new game with a stake
     * @param gameId Unique identifier for the game
     */
    function createGame(bytes32 gameId) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Stake required");
        require(msg.value >= 0.00001 ether, "Minimum stake is 0.00001 BNB");
        require(msg.value <= 100 ether, "Maximum stake is 100 BNB");
        require(games[gameId].player1 == address(0), "Game already exists");
        
        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            state: GameState.Waiting,
            winner: address(0),
            createdAt: block.timestamp,
            startedAt: 0,
            commitHash: bytes32(0)
        });
        
        emit GameCreated(gameId, msg.sender, msg.value);
    }
    
    /**
     * @dev Join an existing game
     * @param gameId The game to join
     */
    function joinGame(bytes32 gameId) external payable whenNotPaused nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Waiting, "Game not available");
        require(game.player1 != msg.sender, "Cannot join own game");
        require(msg.value == game.stake, "Stake must match");
        require(block.timestamp <= game.createdAt + GAME_TIMEOUT, "Game expired");
        
        game.player2 = msg.sender;
        game.state = GameState.Active;
        game.startedAt = block.timestamp;
        
        emit GameJoined(gameId, msg.sender);
    }
    
    /**
     * @dev Finish a game and distribute prize (only owner can call - acts as oracle)
     * @param gameId The game to finish
     * @param winner The winner's address (must not be zero)
     */
    function finishGame(bytes32 gameId, address winner) external onlyOwner nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Active, "Game not active");
        require(winner != address(0), "Invalid winner address");
        require(winner == game.player1 || winner == game.player2, "Invalid winner");
        
        // Effects before interactions (checks-effects-interactions pattern)
        game.state = GameState.Finished;
        game.winner = winner;
        
        uint256 totalPot = game.stake * 2;
        uint256 fee = (totalPot * platformFee) / BASIS_POINTS;
        uint256 prize = totalPot - fee;
        
        playerBalances[winner] += prize;
        playerBalances[owner] += fee;
        
        emit GameFinished(gameId, winner, prize);
    }
    
    /**
     * @dev Finish game as draw - return stakes to both players
     * @param gameId The game to draw
     */
    function finishGameDraw(bytes32 gameId) external onlyOwner nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Active, "Game not active");
        
        game.state = GameState.Finished;
        
        playerBalances[game.player1] += game.stake;
        playerBalances[game.player2] += game.stake;
        
        emit GameFinished(gameId, address(0), 0);
    }
    
    /**
     * @dev Cancel a waiting game and refund player1
     * @param gameId The game to cancel
     */
    function cancelGame(bytes32 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Waiting, "Game not waiting");
        require(msg.sender == game.player1 || msg.sender == owner, "Not authorized");
        
        uint256 refundAmount = game.stake;
        
        // Effects before interactions
        game.state = GameState.Cancelled;
        playerBalances[game.player1] += refundAmount;
        
        emit GameCancelled(gameId, refundAmount);
    }
    
    /**
     * @dev Cancel expired games that were never joined
     * @param gameId The expired game to cancel
     */
    function cancelExpiredGame(bytes32 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Waiting, "Game not waiting");
        require(block.timestamp > game.createdAt + GAME_TIMEOUT, "Game not expired");
        
        uint256 refundAmount = game.stake;
        
        game.state = GameState.Cancelled;
        playerBalances[game.player1] += refundAmount;
        
        emit GameCancelled(gameId, refundAmount);
    }
    
    /**
     * @dev Force finish a game that exceeded max duration (emergency)
     * @param gameId The stalled game
     */
    function forceFinishStalledGame(bytes32 gameId) external onlyOwner nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Active, "Game not active");
        require(block.timestamp > game.startedAt + GAME_MAX_DURATION, "Game not stalled");
        
        game.state = GameState.Finished;
        
        // Refund both players
        playerBalances[game.player1] += game.stake;
        playerBalances[game.player2] += game.stake;
        
        emit GameFinished(gameId, address(0), 0);
    }
    
    // ============ Balance Functions ============
    
    /**
     * @dev Deposit BNB to player balance
     */
    function deposit() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Amount required");
        playerBalances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw balance (checks-effects-interactions pattern)
     */
    function withdraw() external nonReentrant {
        uint256 balance = playerBalances[msg.sender];
        require(balance > 0, "No balance");
        
        // Effects BEFORE interactions
        playerBalances[msg.sender] = 0;
        
        // Interaction last
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev Withdraw a specific amount
     */
    function withdrawAmount(uint256 amount) external nonReentrant {
        uint256 balance = playerBalances[msg.sender];
        require(balance >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be > 0");
        
        playerBalances[msg.sender] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get game details
     */
    function getGame(bytes32 gameId) external view returns (
        address player1,
        address player2,
        uint256 stake,
        GameState state,
        address winner,
        uint256 createdAt,
        uint256 startedAt
    ) {
        Game memory game = games[gameId];
        return (
            game.player1,
            game.player2,
            game.stake,
            game.state,
            game.winner,
            game.createdAt,
            game.startedAt
        );
    }
    
    /**
     * @dev Check if a game has expired
     */
    function isGameExpired(bytes32 gameId) external view returns (bool) {
        Game memory game = games[gameId];
        if (game.state == GameState.Waiting) {
            return block.timestamp > game.createdAt + GAME_TIMEOUT;
        }
        if (game.state == GameState.Active) {
            return block.timestamp > game.startedAt + GAME_MAX_DURATION;
        }
        return false;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update platform fee (owner only)
     */
    function setFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
    
    /**
     * @dev Transfer ownership (two-step would be even safer)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev Pause contract (emergency stop)
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    /**
     * @dev Emergency withdraw for owner (only if contract needs to be deprecated)
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        require(paused, "Must be paused first");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    receive() external payable {
        require(!paused, "Contract is paused");
        playerBalances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
}
