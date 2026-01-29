class UI {
  constructor() {
    this.menu = document.getElementById('menu');
    this.message = document.getElementById('message');
  }

  hideMenu() {
    this.menu.style.display = 'none';
  }

  showMenu() {
    this.menu.style.display = 'block';
  }

  showMessage(text, duration = 2000) {
    this.message.textContent = text;
    this.message.style.opacity = 1;

    setTimeout(() => {
      this.message.style.opacity = 0;
    }, duration);
  }

  showGameOver(winner) {
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
      <div class="game-over-content">
        <h2>Game Over</h2>
        <p>${winner} wins by assassination!</p>
        <button onclick="location.reload()">Play Again</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  updateTurnIndicator(currentTurn, playerName) {
    const indicator = document.getElementById('turnIndicator');
    if (indicator) {
      indicator.textContent = `${playerName}'s Turn`;
    }
  }

  updateGhostStatus(ghostUsed) {
    const status = document.getElementById('ghostStatus');
    if (status) {
      status.textContent = ghostUsed ? 'Ghost: Used' : 'Ghost: Available';
      status.className = ghostUsed ? 'ghost-used' : 'ghost-available';
    }
  }

  updateTurnCount(turnCount) {
    const count = document.getElementById('turnCount');
    if (count) {
      count.textContent = `Turn: ${turnCount}`;
    }
  }

  createHUD() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div class="hud-section">
        <span id="turnIndicator">Player's Turn</span>
      </div>
      <div class="hud-section">
        <span id="turnCount">Turn: 1</span>
      </div>
      <div class="hud-section">
        <span id="ghostStatus" class="ghost-available">Ghost: Available</span>
      </div>
    `;
    return hud;
  }

  showNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  createTooltip(text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    return tooltip;
  }

  createButton(text, onClick, className = 'game-button') {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  createPanel(title, content) {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>${title}</h3>
      </div>
      <div class="panel-content">
        ${content}
      </div>
    `;
    return panel;
  }
}
