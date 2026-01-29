class SaveManager {
  constructor() {
    this.saveKey = 'shadowChessSave';
    this.autosaveKey = 'shadowChessAutosave';
  }

  saveGame(gameState, options = {}) {
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      boardWidth: gameState.board.width,
      boardHeight: gameState.board.height,
      terrain: gameState.board.terrain,
      players: gameState.players,
      pieces: gameState.pieces.map(p => ({
        id: p.id,
        type: p.type,
        owner: p.owner,
        position: { ...p.position },
        hasMoved: p.hasMoved,
        isGhostActive: p.isGhostActive,
        isDisguised: p.isDisguised
      })),
      currentTurn: gameState.currentTurn,
      turnCount: gameState.turnCount,
      fog: {
        visible: Array.from(gameState.fog.visible),
        recentlyRevealed: Array.from(gameState.fog.recentlyRevealed),
        memory: Array.from(gameState.fog.memory)
      },
      options: {
        ...options
      }
    };

    try {
      const serialized = JSON.stringify(saveData);
      localStorage.setItem(this.saveKey, serialized);
      return { success: true };
    } catch (error) {
      console.error('Save failed:', error);
      return { success: false, error: 'Storage full or unavailable' };
    }
  }

  loadGame() {
    try {
      const serialized = localStorage.getItem(this.saveKey);
      if (!serialized) {
        return { success: false, error: 'No save found' };
      }

      const saveData = JSON.parse(serialized);
      return { success: true, data: this.validateAndRestore(saveData) };
    } catch (error) {
      console.error('Load failed:', error);
      return { success: false, error: 'Invalid save file' };
    }
  }

  autosaveGame(gameState, options = {}) {
    return this.saveGame(gameState, { ...options, isAutosave: true });
  }

  loadAutosave() {
    try {
      const serialized = localStorage.getItem(this.autosaveKey);
      if (!serialized) {
        return { success: false, error: 'No autosave found' };
      }

      const saveData = JSON.parse(serialized);
      return { success: true, data: this.validateAndRestore(saveData) };
    } catch (error) {
      console.error('Load autosave failed:', error);
      return { success: false, error: 'Invalid autosave' };
    }
  }

  deleteSave() {
    localStorage.removeItem(this.saveKey);
    return { success: true };
  }

  deleteAutosave() {
    localStorage.removeItem(this.autosaveKey);
    return { success: true };
  }

  hasSave() {
    return localStorage.getItem(this.saveKey) !== null;
  }

  hasAutosave() {
    return localStorage.getItem(this.autosaveKey) !== null;
  }

  getSaveInfo() {
    try {
      const serialized = localStorage.getItem(this.saveKey);
      if (!serialized) return null;

      const saveData = JSON.parse(serialized);
      return {
        timestamp: saveData.timestamp,
        boardSize: `${saveData.boardWidth}x${saveData.boardHeight}`,
        turnCount: saveData.turnCount,
        currentTurn: saveData.currentTurn === 0 ? 'Player' : 'AI'
      };
    } catch (error) {
      return null;
    }
  }

  validateAndRestore(saveData) {
    if (!this.isValidVersion(saveData)) {
      throw new Error('Incompatible save version');
    }

    if (!this.validateBoard(saveData)) {
      throw new Error('Invalid board data');
    }

    if (!this.validatePieces(saveData)) {
      throw new Error('Invalid pieces data');
    }

    return {
      board: {
        width: saveData.boardWidth,
        height: saveData.boardHeight,
        terrain: saveData.terrain
      },
      players: saveData.players.map(p => ({ ...p })),
      pieces: saveData.pieces.map(p => {
        const piece = new Piece(p.id, p.type, p.owner, p.position);
        piece.hasMoved = p.hasMoved;
        piece.isGhostActive = p.isGhostActive;
        piece.isDisguised = p.isDisguised;
        return piece;
      }),
      currentTurn: saveData.currentTurn,
      turnCount: saveData.turnCount,
      fog: {
        visible: new Set(saveData.fog.visible),
        recentlyRevealed: new Map(saveData.fog.recentlyRevealed),
        memory: new Set(saveData.fog.memory)
      },
      options: saveData.options || {}
    };
  }

  isValidVersion(saveData) {
    return saveData && saveData.version && saveData.version === '1.0';
  }

  validateBoard(saveData) {
    return saveData.boardWidth &&
           saveData.boardHeight &&
           saveData.terrain &&
           Array.isArray(saveData.terrain) &&
           saveData.terrain.length === saveData.boardHeight &&
           saveData.terrain.every(row => row.length === saveData.boardWidth);
  }

  validatePieces(saveData) {
    const validTypes = ['PAWN', 'ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING'];
    return saveData.pieces &&
           Array.isArray(saveData.pieces) &&
           saveData.pieces.every(p =>
             p.id &&
             validTypes.includes(p.type) &&
             typeof p.owner === 'number' &&
             p.position &&
             typeof p.position.x === 'number' &&
             typeof p.position.y === 'number'
           );
  }
}