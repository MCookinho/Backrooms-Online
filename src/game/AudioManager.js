export class AudioManager {
  constructor() {
    this.ctx = null;
    this.sounds = {};
    this.ambienceNodes = {};
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.initialized = false;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.masterGain);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = 0.3;
      this.ambienceGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  _ensureResumed() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(name) {
    if (!this.initialized) return;
    this._ensureResumed();

    switch (name) {
      case 'pickup':
        this._playTone(800, 0.1, 'sine', 0.3);
        break;
      case 'footstep':
        this._playNoise(0.05, 0.15);
        break;
      case 'hurt':
        this._playTone(200, 0.2, 'sawtooth', 0.4);
        break;
      case 'door':
        this._playNoise(0.15, 0.3);
        break;
    }
  }

  _playTone(freq, duration, type = 'sine', vol = 0.3) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _playNoise(duration, vol = 0.2) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  playAmbience(name) {
    if (!this.initialized) return;
    this._ensureResumed();

    if (this.ambienceNodes[name]) return;

    if (name === 'level0') {
      this._createBuzzAmbience(name);
    }
  }

  _createBuzzAmbience(name) {
    const duration = 2;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      const hum = Math.sin(2 * Math.PI * 60 * t) * 0.3;
      const buzz = Math.sin(2 * Math.PI * 120 * t) * 0.15;
      const flicker = Math.sin(2 * Math.PI * 3 * t) * 0.5 + 0.5;
      data[i] = (hum + buzz) * (0.3 + flicker * 0.2) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(this.ambienceGain);
    source.start();
    lfo.start();

    this.ambienceNodes[name] = { source, filter, lfo };
  }

  stopAmbience(name) {
    const node = this.ambienceNodes[name];
    if (node) {
      node.source.stop();
      node.lfo.stop();
      delete this.ambienceNodes[name];
    }
  }

  setMasterVolume(vol) {
    if (this.masterGain) {
      this.masterGain.gain.value = vol;
    }
  }

  dispose() {
    for (const name of Object.keys(this.ambienceNodes)) {
      this.stopAmbience(name);
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
