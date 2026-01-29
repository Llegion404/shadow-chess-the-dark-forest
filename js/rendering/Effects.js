class Effects {
  constructor() {
    this.activeEffects = [];
  }

  createPulse(position, type, duration) {
    return {
      id: Date.now() + Math.random(),
      type: 'pulse',
      position,
      pulseType: type,
      duration,
      startTime: Date.now(),
      maxRadius: 150
    };
  }

  createCaptureEffect(position, color) {
    return {
      id: Date.now() + Math.random(),
      type: 'capture',
      position,
      color,
      duration: 500,
      startTime: Date.now()
    };
  }

  createGhostTrail(startPosition, endPosition) {
    return {
      id: Date.now() + Math.random(),
      type: 'ghost',
      start: startPosition,
      end: endPosition,
      duration: 1000,
      startTime: Date.now()
    };
  }

  createExplosion(position, color) {
    const particles = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 / 20) * i;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        color: color,
        size: 2 + Math.random() * 3
      });
    }
    return particles;
  }

  update(deltaTime) {
    const now = Date.now();
    this.activeEffects = this.activeEffects.filter(effect => {
      return (now - effect.startTime) < effect.duration;
    });
  }

  getActiveEffects() {
    return this.activeEffects;
  }

  render(ctx, renderer) {
    this.activeEffects.forEach(effect => {
      switch(effect.type) {
        case 'pulse':
          this.renderPulse(ctx, effect, renderer);
          break;
        case 'capture':
          this.renderCapture(ctx, effect, renderer);
          break;
        case 'ghost':
          this.renderGhost(ctx, effect, renderer);
          break;
      }
    });
  }

  renderPulse(ctx, effect, renderer) {
    const now = Date.now();
    const elapsed = now - effect.startTime;
    const progress = elapsed / effect.duration;
    const alpha = 1 - progress;

    const screenPos = renderer.boardToScreen(effect.position);
    const cellSize = renderer.getCellSize();

    let color;
    switch(effect.pulseType) {
      case 'ROOK':
        color = `rgba(100, 100, 255, ${alpha * 0.5})`;
        break;
      case 'BISHOP':
        color = `rgba(255, 100, 255, ${alpha * 0.5})`;
        break;
      case 'KNIGHT':
        color = `rgba(100, 255, 100, ${alpha * 0.5})`;
        break;
      case 'QUEEN':
        color = `rgba(255, 255, 100, ${alpha * 0.5})`;
        break;
      case 'KING':
        color = `rgba(255, 150, 50, ${alpha * 0.5})`;
        break;
      case 'PAWN':
        color = `rgba(200, 200, 200, ${alpha * 0.5})`;
        break;
      default:
        color = `rgba(150, 150, 150, ${alpha * 0.5})`;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x + cellSize/2, screenPos.y + cellSize/2,
            effect.maxRadius * progress, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderCapture(ctx, effect, renderer) {
    const now = Date.now();
    const elapsed = now - effect.startTime;
    const progress = elapsed / effect.duration;
    const alpha = 1 - progress;

    const screenPos = renderer.boardToScreen(effect.position);
    const cellSize = renderer.getCellSize();

    ctx.fillStyle = effect.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.fillRect(screenPos.x, screenPos.y, cellSize, cellSize);
  }

  renderGhost(ctx, effect, renderer) {
    const now = Date.now();
    const elapsed = now - effect.startTime;
    const progress = elapsed / effect.duration;
    const alpha = 1 - progress;

    const startScreen = renderer.boardToScreen(effect.start);
    const endScreen = renderer.boardToScreen(effect.end);
    const cellSize = renderer.getCellSize();

    ctx.strokeStyle = `rgba(150, 150, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startScreen.x + cellSize/2, startScreen.y + cellSize/2);
    ctx.lineTo(endScreen.x + cellSize/2, endScreen.y + cellSize/2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
