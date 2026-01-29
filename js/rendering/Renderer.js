class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.cellSize = 40;
    this.offsetX = 0;
    this.offsetY = 0;
    this.highlightedSquare = null;
    this.particleSystem = new ParticleSystem();
    this.soundEngine = null;
  }

  init(state) {
    this.calculateDimensions(state);
    this.particleSystem.init(state);
  }

  calculateDimensions(state) {
    const boardWidth = state.board.width * this.cellSize;
    const boardHeight = state.board.height * this.cellSize;

    this.offsetX = Math.max(0, (this.canvas.width - boardWidth) / 2);
    this.offsetY = Math.max(0, (this.canvas.height - boardHeight) / 2);
  }

  getCellSize() {
    return this.cellSize;
  }

  getOffsetX() {
    return this.offsetX;
  }

  getOffsetY() {
    return this.offsetY;
  }

  highlightSquare(boardPos) {
    this.highlightedSquare = boardPos;
  }

  update(state) {
    this.particleSystem.update();
  }

  render(state) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderBackground(state);
    this.renderBoard(state);
    this.renderFog(state);
    this.renderPieces(state);
    this.renderUI(state);
    this.renderPulses(state);
    this.particleSystem.render(this.ctx);
  }

  renderBackground(state) {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );

    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1a');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderBoard(state) {
    const { width, height, terrain } = state.board;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.renderCell(x, y, terrain[y][x], state);
      }
    }
  }

  renderCell(x, y, terrain, state) {
    const screenX = this.offsetX + x * this.cellSize;
    const screenY = this.offsetY + y * this.cellSize;

    let color;
    switch(terrain) {
      case 'PLAIN':
        color = (x + y) % 2 === 0 ? '#2a2a3a' : '#3a3a4a';
        break;
      case 'FOREST':
        color = (x + y) % 2 === 0 ? '#1a3a1a' : '#2a4a2a';
        break;
      case 'RUINS':
        color = '#1a1a1a';
        break;
      case 'SACRED':
        color = (x + y) % 2 === 0 ? '#4a3a1a' : '#5a4a2a';
        break;
      case 'SWAMP':
        color = (x + y) % 2 === 0 ? '#1a2a2a' : '#2a3a3a';
        break;
      default:
        color = (x + y) % 2 === 0 ? '#2a2a3a' : '#3a3a4a';
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);

    this.renderTerrainDetails(screenX, screenY, terrain);

    if (state.selectedPiece) {
      const isValidMove = state.validMoves.some(m => m.x === x && m.y === y);
      if (isValidMove) {
        this.ctx.fillStyle = 'rgba(100, 200, 100, 0.3)';
        this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
      }
    }

    if (this.highlightedSquare &&
        this.highlightedSquare.x === x && this.highlightedSquare.y === y) {
      this.ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
      this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
    }
  }

  renderTerrainDetails(screenX, screenY, terrain) {
    const halfCell = this.cellSize / 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.2;

    switch(terrain) {
      case 'FOREST':
        this.ctx.fillStyle = '#1a4a1a';
        for (let i = 0; i < 3; i++) {
          this.ctx.beginPath();
          const offsetX = (Math.random() - 0.5) * this.cellSize * 0.5;
          const offsetY = (Math.random() - 0.5) * this.cellSize * 0.5;
          this.ctx.arc(
            screenX + halfCell + offsetX,
            screenY + halfCell + offsetY,
            this.cellSize * 0.15,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }
        break;

      case 'RUINS':
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(screenX + this.cellSize * 0.2, screenY + this.cellSize * 0.2,
                          this.cellSize * 0.6, this.cellSize * 0.6);
        break;

      case 'SACRED':
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + halfCell, screenY + this.cellSize * 0.2);
        this.ctx.lineTo(screenX + this.cellSize * 0.8, screenY + this.cellSize * 0.8);
        this.ctx.lineTo(screenX + this.cellSize * 0.2, screenY + this.cellSize * 0.8);
        this.ctx.closePath();
        this.ctx.stroke();
        break;

      case 'SWAMP':
        this.ctx.fillStyle = '#3a4a4a';
        for (let i = 0; i < 2; i++) {
          this.ctx.beginPath();
          const bubbleX = screenX + this.cellSize * 0.3 + Math.random() * this.cellSize * 0.4;
          const bubbleY = screenY + this.cellSize * 0.3 + Math.random() * this.cellSize * 0.4;
          this.ctx.arc(bubbleX, bubbleY, this.cellSize * 0.05, 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
    }

    this.ctx.restore();
  }

  renderFog(state) {
    const currentPlayer = state.players[state.currentTurn];
    const visible = state.fog.visible;
    const recentlyRevealed = state.fog.recentlyRevealed;
    const memory = state.fog.memory;

    const { width, height } = state.board;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;

        if (!visible.has(key) && !recentlyRevealed.has(key)) {
          if (memory.has(key)) {
            this.renderMemoryFog(x, y);
          } else {
            this.renderDarkFog(x, y);
          }
        }
      }
    }
  }

  renderDarkFog(x, y) {
    const screenX = this.offsetX + x * this.cellSize;
    const screenY = this.offsetY + y * this.cellSize;

    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
  }

  renderMemoryFog(x, y) {
    const screenX = this.offsetX + x * this.cellSize;
    const screenY = this.offsetY + y * this.cellSize;

    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.7)';
    this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
  }

  renderPieces(state) {
    const visibleSquares = state.fog.visible;
    const currentPlayer = state.players[state.currentTurn];

    state.pieces.forEach(piece => {
      const key = `${piece.position.x},${piece.position.y}`;

      const isVisible = visibleSquares.has(key);
      const isOwnPiece = piece.owner === currentPlayer.id;

      if (isVisible || isOwnPiece) {
        this.renderPiece(piece, state);
      }
    });
  }

  renderPiece(piece, state) {
    const screenX = this.offsetX + piece.position.x * this.cellSize;
    const screenY = this.offsetY + piece.position.y * this.cellSize;
    const halfCell = this.cellSize / 2;
    const quarterCell = this.cellSize / 4;

    const isSelected = state.selectedPiece && state.selectedPiece.id === piece.id;

    if (isSelected) {
      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
    }

    if (piece.isGhostActive) {
      this.ctx.globalAlpha = 0.5;
    }

    this.ctx.fillStyle = piece.owner === 0 ? '#ffffff' : '#ff6b6b';
    this.ctx.strokeStyle = piece.owner === 0 ? '#000000' : '#8b0000';
    this.ctx.lineWidth = 2;

    const displayType = piece.getDisplayType();
    this.ctx.font = `${this.cellSize * 0.6}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const symbol = this.getPieceSymbol(displayType);
    this.ctx.fillText(symbol, screenX + halfCell, screenY + halfCell);

    this.ctx.globalAlpha = 1.0;
  }

  getPieceSymbol(type) {
    const symbols = {
      'PAWN': '♟',
      'ROOK': '♜',
      'KNIGHT': '♞',
      'BISHOP': '♝',
      'QUEEN': '♛',
      'KING': '♚'
    };
    return symbols[type] || '?';
  }

  renderUI(state) {
    const gameInfo = document.getElementById('gameInfo');
    if (gameInfo && gameInfo.style.display !== 'none') {
      return;
    }

    const { currentTurn, turnCount } = state;
    const currentPlayer = state.players[currentTurn];

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.ctx.fillText(`Turn: ${currentPlayer.name}`, 10, 10);
    this.ctx.fillText(`Turn Count: ${turnCount}`, 10, 30);

    if (currentPlayer.ghostUsed) {
      this.ctx.fillStyle = '#ff6666';
      this.ctx.fillText('Ghost: Used', 10, 50);
    } else {
      this.ctx.fillStyle = '#66ff66';
      this.ctx.fillText('Ghost: Available', 10, 50);
    }
  }

  renderPulses(state) {
    const pulses = state.pulses || [];
    if (pulses.length === 0) return;

    pulses.forEach(pulse => {
      this.renderPulse(pulse);
    });
  }

  renderPulse(pulse) {
    const now = Date.now();
    const elapsed = now - pulse.startTime;
    const progress = elapsed / pulse.duration;

    if (progress >= 1) return;

    const alpha = 1 - progress;

    pulse.area.forEach(sq => {
      const screenX = this.offsetX + sq.x * this.cellSize;
      const screenY = this.offsetY + sq.y * this.cellSize;

      let color;
      switch(pulse.type) {
        case 'ROOK':
          color = `rgba(100, 100, 255, ${alpha * 0.3})`;
          break;
        case 'BISHOP':
          color = `rgba(255, 100, 255, ${alpha * 0.3})`;
          break;
        case 'KNIGHT':
          color = `rgba(100, 255, 100, ${alpha * 0.3})`;
          break;
        case 'QUEEN':
          color = `rgba(255, 255, 100, ${alpha * 0.3})`;
          break;
        case 'KING':
          color = `rgba(255, 150, 50, ${alpha * 0.3})`;
          break;
        case 'PAWN':
          color = `rgba(200, 200, 200, ${alpha * 0.3})`;
          break;
        default:
          color = `rgba(150, 150, 150, ${alpha * 0.3})`;
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
    });
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  init(state) {
    this.particles = [];
  }

  addParticle(particle) {
    this.particles.push(particle);
  }

  update() {
    this.particles = this.particles.filter(p => p.life > 0);

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
    });
  }

  render(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }
}
