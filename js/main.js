document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();

  document.getElementById('startBtn').addEventListener('click', () => {
    const boardSize = parseInt(document.getElementById('boardSize').value);
    const aiDifficulty = document.getElementById('aiDifficulty').value;

    game.initGame({ boardSize, aiDifficulty });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') {
      game.toggleGhostMode();
    }
  });

  document.addEventListener('click', () => {
    game.soundEngine?.resume();
  }, { once: true });
});
