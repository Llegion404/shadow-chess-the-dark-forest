class SoundEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.sounds = {};
    this.ambientNode = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;

      this.initSounds();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  initSounds() {
    this.sounds = {
      'ROOK': this.createRookSound(),
      'BISHOP': this.createBishopSound(),
      'KNIGHT': this.createKnightSound(),
      'QUEEN': this.createQueenSound(),
      'KING': this.createKingSound(),
      'PAWN': this.createPawnSound(),
      'GHOST': this.createGhostSound(),
      'CAPTURE': this.createCaptureSound(),
      'KING_CAPTURE': this.createKingCaptureSound(),
      'AMBIENT': this.createAmbientSound()
    };
  }

  createRookSound() {
    return () => {
      this.playTone(200, 0.3, 'sawtooth', 0.5, 100);
    };
  }

  createBishopSound() {
    return () => {
      this.playTone(400, 0.4, 'sine', 0.4, 800);
    };
  }

  createKnightSound() {
    return () => {
      this.playTone(150, 0.1, 'square', 0.3);
      setTimeout(() => this.playTone(200, 0.1, 'square', 0.3), 50);
    };
  }

  createQueenSound() {
    return () => {
      this.playTone(300, 0.5, 'sawtooth', 0.4, 600);
    };
  }

  createKingSound() {
    return () => {
      this.playTone(100, 0.6, 'triangle', 0.6, 150);
    };
  }

  createPawnSound() {
    return () => {
      this.playTone(600, 0.15, 'sine', 0.2, 800);
    };
  }

  createGhostSound() {
    return () => {
      this.playTone(80, 0.8, 'sine', 0.3);
    };
  }

  createCaptureSound() {
    return () => {
      this.playTone(800, 0.2, 'sawtooth', 0.7, 100);
    };
  }

  createKingCaptureSound() {
    return () => {
      this.playTone(400, 1.0, 'sawtooth', 0.8, 100);
      setTimeout(() => this.playTone(500, 1.0, 'square', 0.8, 150), 100);
    };
  }

  createAmbientSound() {
    return () => {
      if (!this.audioContext) return null;

      const noise = this.audioContext.createBufferSource();
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < buffer.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.02;
      }

      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      noise.connect(filter);
      filter.connect(this.masterGain);

      noise.start();
      return noise;
    };
  }

  playTone(frequency, duration, type = 'sine', volume = 0.5, endFreq = null) {
    if (!this.audioContext || !this.initialized) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playPulseSound(pieceType) {
    this.init();

    if (this.sounds[pieceType]) {
      this.sounds[pieceType]();
    }
  }

  playGhostSound() {
    this.init();

    if (this.sounds['GHOST']) {
      this.sounds['GHOST']();
    }
  }

  playCaptureSound() {
    this.init();

    if (this.sounds['CAPTURE']) {
      this.sounds['CAPTURE']();
    }
  }

  playKingCaptureSound() {
    this.init();

    if (this.sounds['KING_CAPTURE']) {
      this.sounds['KING_CAPTURE']();
    }
  }

  startAmbient() {
    this.init();

    if (!this.ambientNode) {
      this.ambientNode = this.sounds['AMBIENT']();
    }
  }

  stopAmbient() {
    if (this.ambientNode) {
      this.ambientNode.stop();
      this.ambientNode = null;
    }
  }

  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
