class EcholocationSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.activePulses = [];
  }

  emitPulse(piece, isSilent = false) {
    if (isSilent) return;

    const pulse = {
      id: Date.now() + Math.random(),
      pieceId: piece.id,
      origin: { ...piece.position },
      area: this.getPulseArea(piece),
      duration: 1500,
      startTime: Date.now(),
      type: piece.type
    };

    this.activePulses.push(pulse);

    if (this.gameState.pulses) {
      this.gameState.pulses.push(pulse);
    }

    this.triggerVisualEffect(pulse);
    this.triggerSoundEffect(pulse);
  }

  getPulseArea(piece) {
    const { type, position } = piece;
    let squares = [];

    switch(type) {
      case 'ROOK':
        squares = this.getBeamPattern(position, 8, 4);
        break;
      case 'BISHOP':
        squares = this.getBeamPattern(position, 8, 4, true);
        break;
      case 'KNIGHT':
        squares = this.getLShapePattern(position);
        break;
      case 'QUEEN':
        squares = this.getBeamPattern(position, 8, 8);
        break;
      case 'KING':
        squares = this.getCirclePattern(position, 2);
        break;
      case 'PAWN':
        squares = this.getDiagonalFlash(position);
        break;
    }

    return squares;
  }

  getBeamPattern(position, range, directions, isDiagonal = false) {
    const squares = [];
    const dirs = isDiagonal
      ? [[1,1], [1,-1], [-1,1], [-1,-1]]
      : [[0,1], [0,-1], [1,0], [-1,0]];

    dirs.forEach(([dx, dy], i) => {
      if (i >= directions) return;

      for (let dist = 1; dist <= range; dist++) {
        const x = position.x + dx * dist;
        const y = position.y + dy * dist;
        if (this.gameState.isValidSquare({x, y})) {
          squares.push({x, y});
        }
      }
    });

    return squares;
  }

  getLShapePattern(position) {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    return offsets.map(([dx, dy]) => ({
      x: position.x + dx,
      y: position.y + dy
    })).filter(sq => this.gameState.isValidSquare(sq));
  }

  getCirclePattern(position, radius) {
    const squares = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius) {
          const x = position.x + dx;
          const y = position.y + dy;
          if (this.gameState.isValidSquare({x, y})) {
            squares.push({x, y});
          }
        }
      }
    }

    return squares;
  }

  getDiagonalFlash(position) {
    const direction = 1;
    const squares = [];

    const left = { x: position.x - 1, y: position.y + direction };
    const right = { x: position.x + 1, y: position.y + direction };

    if (this.gameState.isValidSquare(left)) squares.push(left);
    if (this.gameState.isValidSquare(right)) squares.push(right);

    return squares;
  }

  update(deltaTime) {
    const now = Date.now();
    this.activePulses = this.activePulses.filter(pulse => {
      return (now - pulse.startTime) < pulse.duration;
    });

    if (this.gameState.pulses) {
      this.gameState.pulses = this.activePulses.filter(pulse => {
        return (now - pulse.startTime) < pulse.duration;
      });
    }
  }

  getActivePulses() {
    return this.activePulses;
  }

  triggerVisualEffect(pulse) {
    const event = new CustomEvent('pulseEmit', {
      detail: pulse
    });
    document.dispatchEvent(event);
  }

  triggerSoundEffect(pulse) {
    if (this.gameState.renderer && this.gameState.renderer.soundEngine) {
      this.gameState.renderer.soundEngine.playPulseSound(pulse.type);
    }
  }
}
