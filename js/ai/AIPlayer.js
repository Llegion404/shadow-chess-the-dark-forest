class AIPlayer {
  constructor(playerId, difficulty = 'medium') {
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.searchDepth = this.getSearchDepth(difficulty);
    this.moveTimeout = 2000;
    this.ghostSystem = null;
  }

  setGhostSystem(ghostSystem) {
    this.ghostSystem = ghostSystem;
  }

  getSearchDepth(difficulty) {
    const depths = {
      'easy': 2,
      'medium': 4,
      'hard': 6
    };
    return depths[difficulty] || 3;
  }

  getDynamicDepth(boardSize) {
    if (boardSize >= 24) return 3;
    if (boardSize >= 20) return 4;
    return 6;
  }

  getGhostUseProbability(turnCount, difficulty) {
    if (turnCount < 5) return 0.1;
    if (turnCount < 15) return 0.2;
    if (difficulty === 'hard') return 0.3;
    return 0.15;
  }

  async makeMove(gameState) {
    const player = gameState.players.find(p => p.id === this.playerId);
    const shouldUseGhost = !player.ghostUsed &&
                         Math.random() < this.getGhostUseProbability(gameState.turnCount, this.difficulty);

    if (shouldUseGhost) {
      const ghostMove = this.tryGhostMove(gameState);
      if (ghostMove) {
        return ghostMove;
      }
    }

    const dynamicDepth = this.getDynamicDepth(gameState.board.width);
    const minimax = new Minimax(gameState, this.playerId, dynamicDepth);
    const bestMove = await minimax.findBestMoveAsync(this.moveTimeout);
    return bestMove;
  }

  tryGhostMove(gameState) {
    const player = gameState.players.find(p => p.id === this.playerId);
    if (player.ghostUsed) return null;

    const pieces = gameState.getPiecesByOwner(this.playerId);
    const strategicPieces = pieces.filter(p =>
      ['QUEEN', 'ROOK'].includes(p.type) && p.hasMoved
    );

    if (strategicPieces.length === 0) return null;

    const piece = strategicPieces[Math.floor(Math.random() * strategicPieces.length)];

    if (!this.ghostSystem) return null;

    const canActivate = this.ghostSystem.canActivateGhost(this.playerId, piece.id);
    if (!canActivate) return null;

    const movement = new Movement(gameState);
    const validMoves = movement.getValidMoves(piece);
    if (validMoves.length === 0) return null;

    const sortedMoves = validMoves.sort((a, b) => {
      const scoreA = this.evaluateGhostTarget(a, gameState);
      const scoreB = this.evaluateGhostTarget(b, gameState);
      return scoreB - scoreA;
    });

    const target = sortedMoves[0];
    const result = this.ghostSystem.activateGhost(this.playerId, piece.id);

    if (result.success) {
      piece.activateGhost();
      const executeResult = this.ghostSystem.executeGhostMove(piece.id, target);
      if (executeResult.success) {
        piece.hasMoved = true;
        player.ghostUsed = true;
        return {
          pieceId: piece.id,
          from: { ...piece.position },
          to: { ...target },
          isGhostMove: true
        };
      }
    }

    return null;
  }

  evaluateGhostTarget(position, gameState) {
    const targetPiece = gameState.getPieceAt(position);
    let score = 0;

    if (targetPiece) {
      const pieceValues = {
        'PAWN': 1, 'KNIGHT': 3, 'BISHOP': 3,
        'ROOK': 5, 'QUEEN': 9, 'KING': 1000
      };
      score += pieceValues[targetPiece.type] * 20;

      if (targetPiece.type === 'KING') {
        score += 1000;
      }
    }

    const distanceToEdge = Math.min(
      position.x, gameState.board.width - position.x,
      position.y, gameState.board.height - position.y
    );
    score += distanceToEdge * 2;

    return score;
  }

  getAllValidMoves(gameState, playerId) {
    const pieces = gameState.getPiecesByOwner(playerId);
    const moves = [];

    pieces.forEach(piece => {
      const possibleMoves = this.getPieceMoves(piece, gameState);
      possibleMoves.forEach(target => {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: { ...target },
          score: this.getMoveScore(piece, target)
        });
      });
    });

    return moves.sort((a, b) => b.score - a.score);
  }

  getMoveScore(piece, target) {
    const gameState = piece._gameState;
    if (!gameState) return 0;

    const targetPiece = gameState.getPieceAt(target);
    if (targetPiece) {
      const pieceValues = {
        'PAWN': 1, 'KNIGHT': 3, 'BISHOP': 3,
        'ROOK': 5, 'QUEEN': 9, 'KING': 1000
      };
      return pieceValues[targetPiece.type] * 10;
    }

    return 0;
  }

  getPieceMoves(piece, gameState) {
    const movement = new Movement(gameState);
    piece._gameState = gameState;
    const moves = movement.getValidMoves(piece);
    delete piece._gameState;
    return moves;
  }

  simulateMove(gameState, move) {
    const newState = gameState.clone();
    const piece = newState.pieces.find(p => p.id === move.pieceId);

    if (piece) {
      piece.position.x = move.to.x;
      piece.position.y = move.to.y;
      piece.hasMoved = true;

      if (move.isGhostMove) {
        piece.deactivateGhost();
      }

      const capturedIndex = newState.pieces.findIndex(p =>
        p.position.x === move.to.x && p.position.y === move.to.y &&
        p.id !== move.pieceId
      );

      if (capturedIndex !== -1) {
        const captured = newState.pieces[capturedIndex];
        newState.pieces.splice(capturedIndex, 1);

        if (captured.isKing()) {
          newState.gameOver = true;
          newState.winner = newState.players.find(p => p.id === piece.owner);
        }
      }

      newState.currentTurn = (newState.currentTurn + 1) % 2;
      newState.turnCount++;
    }

    return newState;
  }

  getOpponentId() {
    return this.playerId === 0 ? 1 : 0;
  }

  calculateVisibleSquares(gameState, playerId) {
    const visibilitySystem = new VisibilitySystem(gameState);
    return new Set(visibilitySystem.calculateVisibleSquares(playerId));
  }
}
