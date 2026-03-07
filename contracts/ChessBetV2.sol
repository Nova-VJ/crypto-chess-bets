// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChessBetV2
 * @dev Secure smart contract for chess betting on BSC with BNB and USDT (BEP-20) support
 * Includes: ReentrancyGuard, Pausable, time limits, input validation
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

contract ChessBetV2 {
    // ============ State Variables ============
    address public owner;
    uint256 public platformFee = 250; // 2.5% fee (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant GAME_TIMEOUT = 24 hours;
    uint256 public constant GAME_MAX_DURATION = 48 hours;

    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    // Pause functionality
    bool public paused;

    // USDT BEP-20 on BSC Mainnet
    address public usdtToken = 0x55d398326f99059fF775485246999027B3197955;

    enum GameState { Waiting, Active, Finished, Cancelled }

    struct Game {
        address player1;
        address player2;
        uint256 stake;
        GameState state;
        address winner;
        uint256 createdAt;
        uint256 startedAt;
        bool isToken; // false = BNB, true = USDT
    }

    mapping(bytes32 => Game) public games;
    mapping(address => uint256) public playerBalances;      // BNB balances
    mapping(address => uint256) public playerTokenBalances;  // USDT balances

    // ============ Events ============
    event GameCreated(bytes32 indexed gameId, address indexed player1, uint256 stake, bool isToken);
    event GameJoined(bytes32 indexed gameId, address indexed player2);
    event GameFinished(bytes32 indexed gameId, address indexed winner, uint256 prize);
    event GameCancelled(bytes32 indexed gameId, uint256 refundAmount);
    event Withdrawal(address indexed player, uint256 amount, bool isToken);
    event Deposit(address indexed player, uint256 amount, bool isToken);
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

    // ============ Configuration ============
    function setUsdtToken(address _usdtToken) external onlyOwner {
        require(_usdtToken != address(0), "Invalid address");
        usdtToken = _usdtToken;
    }

    // ============ Game Functions (BNB) ============

    function createGame(bytes32 gameId) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Stake required");
        require(msg.value >= 0.001 ether, "Minimum stake is 0.001 BNB");
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
            isToken: false
        });

        emit GameCreated(gameId, msg.sender, msg.value, false);
    }

    function joinGame(bytes32 gameId) external payable whenNotPaused nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Waiting, "Game not available");
        require(game.player1 != msg.sender, "Cannot join own game");
        require(!game.isToken, "Game requires token payment");
        require(msg.value == game.stake, "Stake must match");
        require(block.timestamp <= game.createdAt + GAME_TIMEOUT, "Game expired");

        game.player2 = msg.sender;
        game.state = GameState.Active;
        game.startedAt = block.timestamp;

        emit GameJoined(gameId, msg.sender);
    }

    // ============ Game Functions (USDT) ============

    function createGameToken(bytes32 gameId, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Stake required");
        require(amount >= 1e18, "Minimum stake is 1 USDT"); // 1 USDT (18 decimals)
        require(amount <= 10000e18, "Maximum stake is 10000 USDT");
        require(games[gameId].player1 == address(0), "Game already exists");

        IERC20 token = IERC20(usdtToken);
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            stake: amount,
            state: GameState.Waiting,
            winner: address(0),
            createdAt: block.timestamp,
            startedAt: 0,
            isToken: true
        });

        emit GameCreated(gameId, msg.sender, amount, true);
    }

    function joinGameToken(bytes32 gameId) external whenNotPaused nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Waiting, "Game not available");
        require(game.player1 != msg.sender, "Cannot join own game");
        require(game.isToken, "Game requires BNB payment");
        require(block.timestamp <= game.createdAt + GAME_TIMEOUT, "Game expired");

        IERC20 token = IERC20(usdtToken);
        require(token.transferFrom(msg.sender, address(this), game.stake), "Transfer failed");

        game.player2 = msg.sender;
        game.state = GameState.Active;
        game.startedAt = block.timestamp;

        emit GameJoined(gameId, msg.sender);
    }

    // ============ Game Resolution ============

    function finishGame(bytes32 gameId, address winner) external onlyOwner nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Active, "Game not active");
        require(winner != address(0), "Invalid winner address");
        require(winner == game.player1 || winner == game.player2, "Invalid winner");

        // Effects before interactions
        game.state = GameState.Finished;
        game.winner = winner;

        uint256 totalPot = game.stake * 2;
        uint256 fee = (totalPot * platformFee) / BASIS_POINTS;
        uint256 prize = totalPot - fee;

        if (game.isToken) {
            playerTokenBalances[winner] += prize;
            playerTokenBalances[owner] += fee;
        } else {
            playerBalances[winner] += prize;
            playerBalances[owner] += fee;
        }

        emit GameFinished(gameId, winner, prize);
    }

    function finishGameDraw(bytes32 gameId) external onlyOwner nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Active, "Game not active");

        game.state = GameState.Finished;

        if (game.isToken) {
            playerTokenBalances[game.player1] += game.stake;
            playerTokenBalances[game.player2] += game.stake;
        } else {
            playerBalances[game.player1] += game.stake;
            playerBalances[game.player2] += game.stake;
        }

        emit GameFinished(gameId, address(0), 0);
    }

    function cancelGame(bytes32 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Waiting, "Game not waiting");
        require(msg.sender == game.player1 || msg.sender == owner, "Not authorized");

        uint256 refundAmount = game.stake;
        game.state = GameState.Cancelled;

        if (game.isToken) {
            playerTokenBalances[game.player1] += refundAmount;
        } else {
            playerBalances[game.player1] += refundAmount;
        }

        emit GameCancelled(gameId, refundAmount);
    }

    function cancelExpiredGame(bytes32 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Waiting, "Game not waiting");
        require(block.timestamp > game.createdAt + GAME_TIMEOUT, "Game not expired");

        uint256 refundAmount = game.stake;
        game.state = GameState.Cancelled;

        if (game.isToken) {
            playerTokenBalances[game.player1] += refundAmount;
        } else {
            playerBalances[game.player1] += refundAmount;
        }

        emit GameCancelled(gameId, refundAmount);
    }

    function forceFinishStalledGame(bytes32 gameId) external onlyOwner nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.state == GameState.Active, "Game not active");
        require(block.timestamp > game.startedAt + GAME_MAX_DURATION, "Game not stalled");

        game.state = GameState.Finished;

        if (game.isToken) {
            playerTokenBalances[game.player1] += game.stake;
            playerTokenBalances[game.player2] += game.stake;
        } else {
            playerBalances[game.player1] += game.stake;
            playerBalances[game.player2] += game.stake;
        }

        emit GameFinished(gameId, address(0), 0);
    }

    // ============ Balance Functions ============

    function deposit() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Amount required");
        playerBalances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value, false);
    }

    function depositToken(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount required");
        IERC20 token = IERC20(usdtToken);
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        playerTokenBalances[msg.sender] += amount;
        emit Deposit(msg.sender, amount, true);
    }

    function withdraw() external nonReentrant {
        uint256 balance = playerBalances[msg.sender];
        require(balance > 0, "No balance");

        // Effects BEFORE interactions
        playerBalances[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, balance, false);
    }

    function withdrawToken() external nonReentrant {
        uint256 balance = playerTokenBalances[msg.sender];
        require(balance > 0, "No balance");

        playerTokenBalances[msg.sender] = 0;

        IERC20 token = IERC20(usdtToken);
        require(token.transfer(msg.sender, balance), "Transfer failed");

        emit Withdrawal(msg.sender, balance, true);
    }

    // ============ View Functions ============

    function getGame(bytes32 gameId) external view returns (
        address player1,
        address player2,
        uint256 stake,
        GameState state,
        address winner,
        uint256 createdAt,
        bool isToken
    ) {
        Game memory game = games[gameId];
        return (
            game.player1,
            game.player2,
            game.stake,
            game.state,
            game.winner,
            game.createdAt,
            game.isToken
        );
    }

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

    function setFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high");
        platformFee = newFee;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

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
        emit Deposit(msg.sender, msg.value, false);
    }
}
