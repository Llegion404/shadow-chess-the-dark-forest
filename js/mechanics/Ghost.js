class GhostSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.ghostMovements = new Map();
  }

  canActivateGhost(playerId, pieceId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    const piece = this.gameState.pieces.find(p => p.id === pieceId);

    if (!player || !piece) return false;
    if (player.ghostUsed) return false;
    if (piece.owner !== playerId) return false;

    const movesToEdge = this.calculateMovesToEdge(piece.position);
    if (movesToEdge < 3) return false;

    return true;
  }

  activateGhost(playerId, pieceId) {
    if (!this.canActivateGhost(playerId, pieceId)) {
      return { success: false, reason: 'Invalid ghost activation' };
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    player.ghostUsed = true;

    const piece = this.gameState.pieces.find(p => p.id === pieceId);
    piece.activateGhost();

    this.ghostMovements.set(pieceId, {
      originalPosition: { ...piece.position },
      targetPosition: null,
      activationTime: Date.now()
    });

    return { success: true };
  }

  executeGhostMove(pieceId, targetPosition) {
    const piece = this.gameState.pieces.find(p => p.id === pieceId);
    if (!piece || !piece.isGhostActive) {
      return { success: false, reason: 'Ghost not active' };
    }

    const ghost = this.ghostMovements.get(pieceId);

    const distance = Math.abs(targetPosition.x - piece.position.x) +
                     Math.abs(targetPosition.y - piece.position.y);

    if (distance > 4) {
      return { success: false, reason: 'Ghost movement limited to 4 squares' };
    }

    const dx = Math.sign(targetPosition.x - piece.position.x);
    const dy = Math.sign(targetPosition.y - piece.position.y);

    const movement = new Movement(this.gameState);
    const validMoves = movement.getValidMoves(piece);
    const isValidTarget = validMoves.some(m => m.x === targetPosition.x && m.y === targetPosition.y);

    if (!isValidTarget) {
      return { success: false, reason: 'Invalid ghost move target' };
    }

    piece.position.x = targetPosition.x;
    piece.position.y = targetPosition.y;
    piece.hasMoved = true;

    ghost.targetPosition = { ...piece.position };
    piece.deactivateGhost();

    return { success: true, distance };
  }

  calculateMovesToEdge(position) {
    const { width, height } = this.gameState.board;
    const minToXEdge = Math.min(position.x, width - position.x);
    const minToYEdge = Math.min(position.y, height - position.y);
    return Math.min(minToXEdge, minToYEdge);
  }
}
