class VisibilitySystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  calculateVisibleSquares(playerId) {
    const visible = new Set();
    const pieces = this.gameState.getPiecesByOwner(playerId);

    pieces.forEach(piece => {
      const threatSquares = this.getThreatSquares(piece);
      threatSquares.forEach(sq => visible.add(`${sq.x},${sq.y}`));
    });

    return visible;
  }

  getThreatSquares(piece) {
    const { type, position } = piece;
    let squares = [];

    switch(type) {
      case 'ROOK':
        squares = this.getRookSquares(position);
        break;
      case 'BISHOP':
        squares = this.getBishopSquares(position);
        break;
      case 'KNIGHT':
        squares = this.getKnightSquares(position);
        break;
      case 'QUEEN':
        squares = [...this.getRookSquares(position), ...this.getBishopSquares(position)];
        break;
      case 'KING':
        squares = this.getKingSquares(position);
        break;
      case 'PAWN':
        squares = this.getPawnCaptureSquares(piece);
        break;
    }

    return squares.filter(sq => this.isValidSquare(sq));
  }

  getRookSquares(position) {
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    const squares = [];

    directions.forEach(([dx, dy]) => {
      let x = position.x + dx;
      let y = position.y + dy;

      while (this.isValidSquare({x, y})) {
        squares.push({x, y});
        if (this.isObstacle({x, y})) break;
        x += dx;
        y += dy;
      }
    });

    return squares;
  }

  getBishopSquares(position) {
    const directions = [[1,1], [1,-1], [-1,1], [-1,-1]];
    const squares = [];

    directions.forEach(([dx, dy]) => {
      let x = position.x + dx;
      let y = position.y + dy;

      while (this.isValidSquare({x, y})) {
        squares.push({x, y});
        if (this.isObstacle({x, y})) break;
        x += dx;
        y += dy;
      }
    });

    return squares;
  }

  getKnightSquares(position) {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    return offsets.map(([dx, dy]) => ({
      x: position.x + dx,
      y: position.y + dy
    }));
  }

  getKingSquares(position) {
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],          [0, 1],
      [1, -1],  [1, 0], [1, 1]
    ];

    return offsets.map(([dx, dy]) => ({
      x: position.x + dx,
      y: position.y + dy
    }));
  }

  getPawnCaptureSquares(piece) {
    const direction = piece.owner === 0 ? 1 : -1;

    return [
      { x: piece.position.x - 1, y: piece.position.y + direction },
      { x: piece.position.x + 1, y: piece.position.y + direction }
    ];
  }

  isValidSquare(position) {
    return this.gameState.isValidSquare(position);
  }

  isObstacle(position) {
    return this.gameState.board.isObstacle(position);
  }
}
