class Minimax {
  constructor(gameState, playerId, depth, alphaBeta = true) {
    this.gameState = gameState;
    this.playerId = playerId;
    this.depth = depth;
    this.alphaBeta = alphaBeta;
    this.nodesVisited = 0;
    this.nodesPruned = 0;
  }

  findBestMove() {
    const moves = this.getAllValidMoves(this.gameState, this.playerId);
    if (moves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of moves) {
      this.nodesVisited++;
      const newState = this.simulateMove(this.gameState, move);

      let score;
      if (this.alphaBeta) {
        score = this.minimax(newState, this.depth - 1, false, alpha, beta);
      } else {
        score = this.minimaxNoAlphaBeta(newState, this.depth - 1, false);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
    }

    return bestMove;
  }

  minimax(gameState, depth, isMaximizing, alpha, beta) {
    if (depth === 0 || gameState.gameOver) {
      return this.evaluateState(gameState);
    }

    const currentPlayer = isMaximizing ? this.playerId : this.getOpponentId();
    const moves = this.getAllValidMoves(gameState, currentPlayer);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        this.nodesVisited++;
        const newState = this.simulateMove(gameState, move);
        const evalScore = this.minimax(newState, depth - 1, false, alpha, beta);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);

        if (beta <= alpha) {
          this.nodesPruned++;
          break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        this.nodesVisited++;
        const newState = this.simulateMove(gameState, move);
        const evalScore = this.minimax(newState, depth - 1, true, alpha, beta);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);

        if (beta <= alpha) {
          this.nodesPruned++;
          break;
        }
      }
      return minEval;
    }
  }

  minimaxNoAlphaBeta(gameState, depth, isMaximizing) {
    if (depth === 0 || gameState.gameOver) {
      return this.evaluateState(gameState);
    }

    const currentPlayer = isMaximizing ? this.playerId : this.getOpponentId();
    const moves = this.getAllValidMoves(gameState, currentPlayer);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        this.nodesVisited++;
        const newState = this.simulateMove(gameState, move);
        const evalScore = this.minimaxNoAlphaBeta(newState, depth - 1, false);
        maxEval = Math.max(maxEval, evalScore);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        this.nodesVisited++;
        const newState = this.simulateMove(gameState, move);
        const evalScore = this.minimaxNoAlphaBeta(newState, depth - 1, true);
        minEval = Math.min(minEval, evalScore);
      }
      return minEval;
    }
  }

  evaluateState(gameState) {
    let score = 0;

    const myPieces = gameState.getPiecesByOwner(this.playerId);
    const enemyPieces = gameState.getPiecesByOwner(this.getOpponentId());

    score += this.evaluatePieces(myPieces) - this.evaluatePieces(enemyPieces);

    const myVisible = this.calculateVisibleSquares(gameState, this.playerId);
    const enemyVisible = this.calculateVisibleSquares(gameState, this.getOpponentId());

    score += (myVisible.size - enemyVisible.size) * 0.5;

    const ghostUsed = gameState.players.find(p => p.id === this.playerId).ghostUsed;
    if (!ghostUsed) score += 2;

    const decoys = myPieces.filter(p => p.isDisguised && p.type !== 'KING');
    score += decoys.length * 3;

    return score;
  }

  evaluatePieces(pieces) {
    const pieceValues = {
      'PAWN': 1,
      'KNIGHT': 3,
      'BISHOP': 3,
      'ROOK': 5,
      'QUEEN': 9,
      'KING': 1000
    };

    return pieces.reduce((sum, piece) => {
      return sum + pieceValues[piece.type];
    }, 0);
  }

  getAllValidMoves(gameState, playerId) {
    const pieces = gameState.getPiecesByOwner(playerId);
    const moves = [];

    pieces.forEach(piece => {
      const movement = new Movement(gameState);
      const possibleMoves = movement.getValidMoves(piece);
      possibleMoves.forEach(target => {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: { ...target },
          score: this.getMoveScore(piece, target, gameState)
        });
      });
    });

    return moves.sort((a, b) => b.score - a.score);
  }

  getMoveScore(piece, target, gameState) {
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

  async findBestMoveAsync(timeout = 2000) {
    const startTime = Date.now();
    const moves = this.getAllValidMoves(this.gameState, this.playerId);
    if (moves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of moves) {
      if (Date.now() - startTime > timeout) break;

      this.nodesVisited++;
      const newState = this.simulateMove(this.gameState, move);

      let score;
      if (this.alphaBeta) {
        score = this.minimax(newState, this.depth - 1, false, alpha, beta);
      } else {
        score = this.minimaxNoAlphaBeta(newState, this.depth - 1, false);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
    }

    return bestMove;
  }

  simulateMove(gameState, move) {
    const newState = gameState.clone();
    const piece = newState.pieces.find(p => p.id === move.pieceId);

    if (piece) {
      piece.position.x = move.to.x;
      piece.position.y = move.to.y;
      piece.hasMoved = true;

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

  getStats() {
    return {
      nodesVisited: this.nodesVisited,
      nodesPruned: this.nodesPruned,
      pruneRate: this.nodesVisited > 0 ? (this.nodesPruned / this.nodesVisited * 100).toFixed(2) : 0
    };
  }
}
