class GameState {
  constructor(board, players, pieces) {
    this.board = board;
    this.players = players;
    this.pieces = pieces;
    this.currentTurn = 0;
    this.turnCount = 0;
    this.fog = {
      visible: new Set(),
      recentlyRevealed: new Map(),
      memory: new Set()
    };
    this.pulses = [];
    this.ghosts = [];
    this.gameOver = false;
    this.winner = null;
    this.selectedPiece = null;
    this.validMoves = [];
    this.history = [];
    this.maxHistoryLength = 10;
  }

  clone() {
    const clonedBoard = this.board.clone();
    const clonedPlayers = this.players.map(p => ({ ...p }));
    const clonedPieces = this.pieces.map(p => p.clone());
    const clonedValidMoves = this.validMoves.map(m => ({ ...m }));

    const cloned = new GameState(clonedBoard, clonedPlayers, clonedPieces);
    cloned.currentTurn = this.currentTurn;
    cloned.turnCount = this.turnCount;
    cloned.fog = {
      visible: new Set(this.fog.visible),
      recentlyRevealed: new Map(this.fog.recentlyRevealed),
      memory: new Set(this.fog.memory)
    };
    cloned.pulses = this.pulses ? [...this.pulses] : [];
    cloned.ghosts = this.ghosts ? [...this.ghosts] : [];
    cloned.gameOver = this.gameOver;
    cloned.winner = this.winner ? { ...this.winner } : null;
    cloned.selectedPiece = this.selectedPiece ? clonedPieces.find(p => p.id === this.selectedPiece.id) : null;
    cloned.validMoves = clonedValidMoves;
    return cloned;
  }

  getPieceAt(position) {
    return this.pieces.find(p =>
      p.position.x === position.x && p.position.y === position.y
    );
  }

  getPiecesByOwner(ownerId) {
    return this.pieces.filter(p => p.owner === ownerId);
  }

  isOccupied(position) {
    return this.pieces.some(p =>
      p.position.x === position.x && p.position.y === position.y
    );
  }

  isEnemyPiece(position, ownerId) {
    const piece = this.getPieceAt(position);
    return piece && piece.owner !== ownerId;
  }

  isOwnPiece(position, ownerId) {
    const piece = this.getPieceAt(position);
    return piece && piece.owner === ownerId;
  }

  isValidSquare(position) {
    return position.x >= 0 && position.x < this.board.width &&
           position.y >= 0 && position.y < this.board.height;
  }

  removePiece(pieceId) {
    const index = this.pieces.findIndex(p => p.id === pieceId);
    if (index !== -1) {
      this.pieces.splice(index, 1);
    }
  }

  endTurn() {
    this.currentTurn = (this.currentTurn + 1) % 2;
    this.turnCount++;
  }

  setWinner(playerId) {
    this.gameOver = true;
    this.winner = this.players.find(p => p.id === playerId);
  }

  saveToHistory() {
    const stateSnapshot = {
      pieces: this.pieces.map(p => p.clone()),
      currentTurn: this.currentTurn,
      turnCount: this.turnCount,
      players: this.players.map(p => ({ ...p })),
      fog: {
        visible: new Set(this.fog.visible),
        recentlyRevealed: new Map(this.fog.recentlyRevealed),
        memory: new Set(this.fog.memory)
      },
      selectedPiece: null,
      validMoves: []
    };

    this.history.push(stateSnapshot);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0) return false;

    const previousState = this.history.pop();
    this.pieces = previousState.pieces;
    this.currentTurn = previousState.currentTurn;
    this.turnCount = previousState.turnCount;
    this.players = previousState.players;
    this.fog = previousState.fog;
    this.selectedPiece = null;
    this.validMoves = [];
    return true;
  }

  canUndo() {
    return this.history.length > 0;
  }
}
