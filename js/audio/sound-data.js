const SoundData = {
  pieceSounds: {
    'PAWN': {
      frequency: 600,
      duration: 0.15,
      type: 'sine',
      volume: 0.2,
      endFreq: 800
    },
    'ROOK': {
      frequency: 200,
      duration: 0.3,
      type: 'sawtooth',
      volume: 0.5,
      endFreq: 100
    },
    'KNIGHT': {
      frequency: 150,
      duration: 0.1,
      type: 'square',
      volume: 0.3,
      endFreq: 200
    },
    'BISHOP': {
      frequency: 400,
      duration: 0.4,
      type: 'sine',
      volume: 0.4,
      endFreq: 800
    },
    'QUEEN': {
      frequency: 300,
      duration: 0.5,
      type: 'sawtooth',
      volume: 0.4,
      endFreq: 600
    },
    'KING': {
      frequency: 100,
      duration: 0.6,
      type: 'triangle',
      volume: 0.6,
      endFreq: 150
    }
  },

  effectSounds: {
    'GHOST': {
      frequency: 80,
      duration: 0.8,
      type: 'sine',
      volume: 0.3,
      endFreq: null
    },
    'CAPTURE': {
      frequency: 800,
      duration: 0.2,
      type: 'sawtooth',
      volume: 0.7,
      endFreq: 100
    },
    'KING_CAPTURE': {
      frequency: 400,
      duration: 1.0,
      type: 'sawtooth',
      volume: 0.8,
      endFreq: 100
    },
    'MOVE': {
      frequency: 300,
      duration: 0.1,
      type: 'sine',
      volume: 0.2,
      endFreq: null
    }
  },

  ambientSound: {
    type: 'noise',
    volume: 0.02,
    filter: {
      type: 'lowpass',
      frequency: 500
    }
  },

  getPieceSound(type) {
    return this.pieceSounds[type] || this.pieceSounds['PAWN'];
  },

  getEffectSound(type) {
    return this.effectSounds[type] || null;
  },

  getAllPieceTypes() {
    return Object.keys(this.pieceSounds);
  },

  getAllEffectTypes() {
    return Object.keys(this.effectSounds);
  }
};
