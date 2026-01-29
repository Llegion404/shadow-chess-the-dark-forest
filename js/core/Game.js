class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = null;
    this.renderer = null;
    this.soundEngine = null;
    this.ai = null;
    this.isMultiplayer = false;
    this.visibilitySystem = null;
    this.echolocationSystem = null;
    this.ghostSystem = null;
    this.saveManager = new SaveManager();
    this.currentOptions = {};

    setTimeout(() => this.resizeCanvas(), 100);
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupInputHandlers();
  }

  resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    const maxWidth = container.clientWidth || 800;
    const maxHeight = container.clientHeight || 600;

    const cellSize = this.renderer ? this.renderer.cellSize : 40;
    const boardWidth = this.state ? this.state.board.width * cellSize : 640;
    const boardHeight = this.state ? this.state.board.height * cellSize : 640;

    const scale = Math.min(maxWidth / boardWidth, maxHeight / boardHeight, 1);

    this.canvas.width = Math.floor(boardWidth * scale);
    this.canvas.height = Math.floor(boardHeight * scale);

    if (this.renderer && this.state) {
      this.renderer.calculateDimensions(this.state);
    }
  }

  initGame(options = {}) {
    const {
      boardSize = 16,
      aiDifficulty = 'medium',
      isMultiplayer = false
    } = options;

    this.isMultiplayer = isMultiplayer;
    this.currentOptions = { boardSize, aiDifficulty, isMultiplayer };
    this.state = this.createInitialState(boardSize);

    this.visibilitySystem = new VisibilitySystem(this.state);
    this.echolocationSystem = new EcholocationSystem(this.state);
    this.ghostSystem = new GhostSystem(this.state);

    this.renderer = new Renderer(this.canvas, this.ctx);
    this.soundEngine = new SoundEngine();

    this.renderer.init(this.state);
    this.updateVisibility();
    this.updateGameInfo();

    const menu = document.getElementById('menu');
    const gameInfo = document.getElementById('gameInfo');
    const gameActions = document.getElementById('gameActions');

    if (menu) menu.style.display = 'none';
    if (gameInfo) gameInfo.style.display = 'block';
    if (gameActions) gameActions.style.display = 'block';

    document.getElementById('undoBtn')?.addEventListener('click', () => this.undoMove());
    document.getElementById('saveBtn')?.addEventListener('click', () => this.saveGame());
    document.getElementById('loadBtn')?.addEventListener('click', () => this.loadGame());
    document.getElementById('restartBtn')?.addEventListener('click', () => this.showRestartConfirmation());
  }

    this.soundEngine.startAmbient();
    this.startGameLoop();
  }

  createInitialState(boardSize) {
    const board = new Board(boardSize, boardSize);
    const players = [
      { id: 0, name: 'Player', ghostUsed: false },
      { id: 1, name: 'Opponent', ghostUsed: false }
    ];
    const pieces = this.createPieces(boardSize, boardSize);

    return new GameState(board, players, pieces);
  }

  createPieces(width, height) {
    const pieces = [];
    const startRows = [0, height - 1];
    const pawnRows = [1, height - 2];

    const pieceTypes = ['ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING', 'BISHOP', 'KNIGHT', 'ROOK'];
    const colOffsets = Math.floor((width - 8) / 2);

    for (let player = 0; player < 2; player++) {
      const backRow = startRows[player];
      const pawnRow = pawnRows[player];
      const direction = player === 0 ? 1 : -1;

      pieceTypes.forEach((type, i) => {
        const id = `p${player}_${type}_${i}`;
        const piece = Piece.createKing(id, type, player, {
          x: colOffsets + i,
          y: backRow
        });

        if (type !== 'KING') {
          piece.isDisguised = false;
        }

        pieces.push(piece);
      });

      for (let i = 0; i < 8; i++) {
        const piece = Piece.create(
          `p${player}_PAWN_${i}`,
          'PAWN',
          player,
          { x: colOffsets + i, y: pawnRow }
        );
        pieces.push(piece);
      }

      const decoyCount = 3;
      for (let i = 0; i < decoyCount; i++) {
        const piece = Piece.createDecoy(
          `p${player}_DECOY_${i}`,
          player,
          { x: colOffsets + 2 + i, y: pawnRow + (direction * 2) }
        );
        pieces.push(piece);
      }
    }

    return pieces;
  }

  setupInputHandlers() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'g' || e.key === 'G') {
        this.toggleGhostMode();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.triggerEcholocation();
      } else if (e.key === 'u' || e.key === 'U') {
        this.undoMove();
      } else if (e.key === 's' || e.key === 'S') {
        this.saveGame();
      } else if (e.key === 'Escape') {
        this.state.selectedPiece = null;
        this.state.validMoves = [];
        if (this.state.selectedPiece && this.state.selectedPiece.isGhostActive) {
          this.state.selectedPiece.deactivateGhost();
          this.updateGameInfo();
        }
      }
    });
  }



  handleClick(e) {
    if (!this.state || this.state.gameOver) return;
    if (this.state.currentTurn !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const boardPos = this.screenToBoard({ x, y });
    if (!boardPos) return;

    this.handleBoardClick(boardPos);
  }

  handleMouseMove(e) {
    if (!this.renderer) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const boardPos = this.screenToBoard({ x, y });
    if (boardPos) {
      this.renderer.highlightSquare(boardPos);
    }
  }

  screenToBoard(screenPos) {
    if (!this.renderer) return null;

    const cellSize = this.renderer.getCellSize();
    const offsetX = this.renderer.getOffsetX();
    const offsetY = this.renderer.getOffsetY();

    const x = Math.floor((screenPos.x - offsetX) / cellSize);
    const y = Math.floor((screenPos.y - offsetY) / cellSize);

    if (!this.state.isValidSquare({ x, y })) return null;

    return { x, y };
  }

  boardToScreen(boardPos) {
    if (!this.renderer) return null;

    const cellSize = this.renderer.getCellSize();
    const offsetX = this.renderer.getOffsetX();
    const offsetY = this.renderer.getOffsetY();

    return {
      x: offsetX + boardPos.x * cellSize,
      y: offsetY + boardPos.y * cellSize
    };
  }

  handleBoardClick(boardPos) {
    const clickedPiece = this.state.pieces.find(p =>
      p.position.x === boardPos.x && p.position.y === boardPos.y && p.owner === 0
    );

    if (this.state.selectedPiece) {
      const isValidMove = this.state.validMoves.some(m =>
        m.x === boardPos.x && m.y === boardPos.y
      );

      if (isValidMove) {
        this.executeMove(this.state.selectedPiece, boardPos);
      } else if (clickedPiece) {
        this.selectPiece(clickedPiece);
      } else {
        this.state.selectedPiece = null;
        this.state.validMoves = [];
      }
    } else if (clickedPiece) {
      this.selectPiece(clickedPiece);
    }
  }

  selectPiece(piece) {
    this.state.selectedPiece = piece;
    this.state.validMoves = this.getValidMoves(piece);
  }

  getValidMoves(piece) {
    const movement = new Movement(this.state);
    const moves = movement.getValidMoves(piece);
    return moves;
  }

  executeMove(piece, target) {
    if (this.state.currentTurn === 0) {
      this.state.saveToHistory();
    }

    const capturedPiece = this.state.getPieceAt(target);

    if (capturedPiece && capturedPiece.owner !== piece.owner) {
      this.state.removePiece(capturedPiece.id);

      if (capturedPiece.isKing()) {
        this.soundEngine.playKingCaptureSound();
        this.endGame(piece.owner);
        return;
      } else if (capturedPiece.isDecoy()) {
        this.showMessage('Decoy captured!');
        this.soundEngine.playCaptureSound();
      } else {
        this.soundEngine.playCaptureSound();
      }
    }

    piece.move(target);

    if (piece.isGhostActive) {
      this.soundEngine.playGhostSound();
      piece.deactivateGhost();
      this.state.players[piece.owner].ghostUsed = true;
      this.updateGameInfo();
    } else {
      this.echolocationSystem.emitPulse(piece);
    }

    this.updateVisibility();
    this.endTurn();
  }

  undoMove() {
    if (!this.state || this.state.gameOver) return;
    if (this.state.currentTurn !== 0) {
      this.showMessage('Cannot undo during AI turn');
      return;
    }
    if (!this.state.canUndo()) {
      this.showMessage('No moves to undo');
      return;
    }

    if (this.state.undo()) {
      this.updateVisibility();
      this.updateGameInfo();
      this.showMessage('Move undone');
    }
  }

  saveGame() {
    if (!this.state || this.state.gameOver) {
      this.showMessage('Cannot save: Game over or not started');
      return;
    }

    const result = this.saveManager.saveGame(this.state, this.currentOptions);
    if (result.success) {
      this.showMessage('Game saved successfully');
      this.saveManager.autosaveGame(this.state, this.currentOptions);
    } else {
      this.showMessage('Save failed: ' + result.error);
    }
  }

  loadGame() {
    if (this.state && !this.state.gameOver && this.state.turnCount > 0) {
      if (!confirm('Loading will discard the current game. Continue?')) {
        return;
      }
    }

    const result = this.saveManager.loadGame();
    if (result.success) {
      this.loadSavedGame(result.data);
      this.showMessage('Game loaded successfully');
    } else {
      this.showMessage('Load failed: ' + result.error);
    }
  }

  loadSavedGame(savedData) {
    const board = new Board(savedData.board.width, savedData.board.height, savedData.board.terrain);
    this.state = new GameState(board, savedData.players, savedData.pieces);
    this.state.currentTurn = savedData.currentTurn;
    this.state.turnCount = savedData.turnCount;
    this.state.fog = savedData.fog;

    this.visibilitySystem = new VisibilitySystem(this.state);
    this.echolocationSystem = new EcholocationSystem(this.state);
    this.ghostSystem = new GhostSystem(this.state);

    if (!this.isMultiplayer && savedData.options.aiDifficulty) {
      this.ai = new AIPlayer(1, savedData.options.aiDifficulty);
      this.ai.setGhostSystem(this.ghostSystem);
    }

    this.updateVisibility();
    this.updateGameInfo();
    this.renderer.init(this.state);

    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameInfo').style.display = 'block';
    document.getElementById('gameActions').style.display = 'block';

    this.soundEngine.startAmbient();
  }

  showRestartConfirmation() {
    if (!this.state || this.state.gameOver) {
      this.resetGame();
      return;
    }

    if (confirm('Are you sure you want to restart? All progress will be lost.')) {
      this.resetGame();
    }
  }

  resetGame() {
    this.state = null;
    this.soundEngine?.stopAmbient();

    document.getElementById('menu').style.display = 'block';
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('gameActions').style.display = 'none';

    this.showMessage('Game reset');
  }

  updateVisibility() {
    const currentPlayer = this.state.players[this.state.currentTurn];
    const newVisible = this.visibilitySystem.calculateVisibleSquares(currentPlayer.id);

    newVisible.forEach(sq => {
      if (!this.state.fog.visible.has(sq)) {
        this.state.fog.recentlyRevealed.set(sq, this.state.turnCount);
      }
    });

    this.state.fog.visible = new Set(newVisible);
    newVisible.forEach(sq => this.state.fog.memory.add(sq));

    const cutoffTurn = this.state.turnCount - 3;
    for (const [sq, turn] of this.state.fog.recentlyRevealed) {
      if (turn < cutoffTurn) {
        this.state.fog.recentlyRevealed.delete(sq);
      }
    }
  }

  updateGameInfo() {
    const turnIndicator = document.getElementById('turnIndicator');
    const ghostMovesIndicator = document.getElementById('ghostMovesIndicator');
    const ghostStatusIndicator = document.getElementById('ghostStatusIndicator');

    if (turnIndicator) {
      const playerName = this.state.currentTurn === 0 ? 'Player' : 'AI';
      turnIndicator.textContent = playerName;
      turnIndicator.className = this.state.currentTurn === 0 ? '' : 'ai';
    }

    if (ghostMovesIndicator) {
      const ghostUsed = this.state.players[0].ghostUsed;
      ghostMovesIndicator.textContent = ghostUsed ? '0 remaining' : '1 remaining';
      ghostMovesIndicator.className = ghostUsed ? 'used' : '';
    }

    if (ghostStatusIndicator) {
      const isActive = this.state.selectedPiece && this.state.selectedPiece.isGhostActive;
      ghostStatusIndicator.textContent = isActive ? 'Active' : 'Inactive';
      ghostStatusIndicator.style.color = isActive ? '#8b5cf6' : '#8b949e';
      ghostStatusIndicator.style.fontWeight = isActive ? '700' : '600';
    }
  }

  endTurn() {
    this.state.selectedPiece = null;
    this.state.validMoves = [];
    this.state.endTurn();
    this.updateGameInfo();

    if (this.state.currentTurn === 1 && !this.isMultiplayer && this.ai) {
      this.showAIThinkingIndicator();
      setTimeout(async () => {
        await this.aiTurn();
        this.hideAIThinkingIndicator();
      }, 500);
    }
  }

  async aiTurn() {
    try {
      const move = await this.ai.makeMove(this.state);

      if (move) {
        const piece = this.state.pieces.find(p => p.id === move.pieceId);
        if (piece) {
          this.executeMove(piece, move.to);
        }
      }
    } catch (error) {
      console.error('AI move error:', error);
    }
  }

  showAIThinkingIndicator() {
    const indicator = document.getElementById('aiThinkingIndicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }

  hideAIThinkingIndicator() {
    const indicator = document.getElementById('aiThinkingIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  toggleGhostMode() {
    if (!this.state.selectedPiece) return;
    if (this.state.players[0].ghostUsed) {
      this.showMessage('Ghost movement already used');
      return;
    }

    const result = this.ghostSystem.activateGhost(0, this.state.selectedPiece.id);

    if (result.success) {
      this.state.selectedPiece.activateGhost();
      this.showMessage('Ghost mode activated');
      this.soundEngine.playGhostSound();
      this.updateGameInfo();
    } else {
      this.showMessage(result.reason);
    }
  }

  triggerEcholocation() {
    if (!this.state || this.state.gameOver) return;
    if (this.state.currentTurn !== 0) return;

    if (this.state.selectedPiece) {
      this.echolocationSystem.emitPulse(this.state.selectedPiece);
      this.showMessage('Echolocation pulse emitted');
    } else {
      this.showMessage('Select a piece first');
    }
  }

  showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.classList.add('visible');

    setTimeout(() => {
      messageEl.classList.remove('visible');
    }, 2000);
  }

  endGame(winnerId) {
    this.state.setWinner(winnerId);
    this.soundEngine.stopAmbient();

    const winnerName = this.state.winner.name;
    this.showMessage(`${winnerName} wins by assassination!`);

    const ui = new UI();
    ui.showGameOver(winnerName);
  }

  startGameLoop() {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  update() {
    if (!this.state) return;

    this.echolocationSystem.update(16);
    this.renderer.update(this.state);
  }

  render() {
    if (!this.renderer) return;

    if (!this.state) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = 'rgba(13, 17, 23, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#8b949e';
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('Start a game to begin', this.canvas.width / 2, this.canvas.height / 2);
      return;
    }

    this.renderer.render(this.state);
  }
}
