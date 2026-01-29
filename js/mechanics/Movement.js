class Movement {
  constructor(gameState) {
    this.gameState = gameState;
  }

  getValidMoves(piece) {
    const { type, position, owner } = piece;
    const moves = [];

    switch(type) {
      case 'PAWN':
        moves.push(...this.getPawnMoves(piece));
        break;
      case 'ROOK':
        moves.push(...this.getSlidingMoves(piece, [[0,1], [0,-1], [1,0], [-1,0]]));
        break;
      case 'BISHOP':
        moves.push(...this.getSlidingMoves(piece, [[1,1], [1,-1], [-1,1], [-1,-1]]));
        break;
      case 'KNIGHT':
        moves.push(...this.getKnightMoves(piece));
        break;
      case 'QUEEN':
        moves.push(...this.getSlidingMoves(piece, [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]));
        break;
      case 'KING':
        moves.push(...this.getKingMoves(piece));
        break;
    }

    return moves;
  }

  getPawnMoves(piece) {
    const moves = [];
    const { position, owner } = piece;
    const direction = owner === 0 ? 1 : -1;
    const terrain = this.gameState.board.getTerrainAt(position);
    const modifier = this.gameState.board.getTerrainModifier(terrain, 'PAWN');

    const forward = { x: position.x, y: position.y + direction };
    if (this.isValidSquare(forward) && !this.isOccupied(forward)) {
      moves.push(forward);
    }

    if (!piece.hasMoved && modifier !== 'BLOCKED') {
      const doubleForward = { x: position.x, y: position.y + 2 * direction };
      if (this.isValidSquare(doubleForward) && !this.isOccupied(doubleForward)) {
        moves.push(doubleForward);
      }
    }

    const captures = [
      { x: position.x - 1, y: position.y + direction },
      { x: position.x + 1, y: position.y + direction }
    ];

    captures.forEach(sq => {
      if (this.isValidSquare(sq)) {
        if (this.isEnemyPiece(sq, owner)) {
          moves.push(sq);
        }
      }
    });

    return moves;
  }

  getSlidingMoves(piece, directions) {
    const moves = [];
    const { position, owner } = piece;
    const terrain = this.gameState.board.getTerrainAt(position);
    let maxRange = 8;
    let currentSquare = { x: position.x, y: position.y };

    const modifier = this.gameState.board.getTerrainModifier(terrain, piece.type);
    if (modifier === 'BLOCKED') return moves;

    if (typeof modifier === 'number') {
      maxRange += modifier;
      maxRange = Math.max(1, maxRange);
    }

    directions.forEach(([dx, dy]) => {
      let x = position.x + dx;
      let y = position.y + dy;
      let range = 0;

      while (this.isValidSquare({x, y}) && range < maxRange) {
        const currentTerrain = this.gameState.board.getTerrainAt({x, y});
        if (this.isObstacle({x, y})) break;

        range++;

        if (this.isOccupied({x, y})) {
          if (this.isEnemyPiece({x, y}, owner)) {
            moves.push({x, y});
          }
          break;
        }

        moves.push({x, y});
        x += dx;
        y += dy;
      }
    });

    return moves;
  }

  getKnightMoves(piece) {
    const moves = [];
    const { position, owner } = piece;
    const terrain = this.gameState.board.getTerrainAt(position);
    const modifier = this.gameState.board.getTerrainModifier(terrain, 'KNIGHT');

    if (modifier === 'BLOCKED') return moves;

    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    offsets.forEach(([dx, dy]) => {
      const target = { x: position.x + dx, y: position.y + dy };
      const targetTerrain = this.gameState.board.getTerrainAt(target);
      if (this.isValidSquare(target) && !this.gameState.board.isObstacle(target)) {
        if (!this.isOccupied(target) || this.isEnemyPiece(target, owner)) {
          moves.push(target);
        }
      }
    });

    return moves;
  }

  getKingMoves(piece) {
    const moves = [];
    const { position, owner } = piece;
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],          [0, 1],
      [1, -1],  [1, 0], [1, 1]
    ];

    offsets.forEach(([dx, dy]) => {
      const target = { x: position.x + dx, y: position.y + dy };
      if (this.isValidSquare(target)) {
        if (!this.isOccupied(target) || this.isEnemyPiece(target, owner)) {
          moves.push(target);
        }
      }
    });

    return moves;
  }

  isValidSquare(position) {
    return this.gameState.isValidSquare(position);
  }

  isObstacle(position) {
    return this.gameState.board.isObstacle(position);
  }

  isOccupied(position) {
    return this.gameState.isOccupied(position);
  }

  isEnemyPiece(position, ownerId) {
    return this.gameState.isEnemyPiece(position, ownerId);
  }

  isOwnPiece(position, ownerId) {
    return this.gameState.isOwnPiece(position, ownerId);
  }
}
