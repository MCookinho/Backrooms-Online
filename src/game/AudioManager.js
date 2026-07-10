const SOUND_URLS = {
  flashlight: 'https://cdn.freesound.org/previews/502/502506_4921277-lq.mp3',
  jump: 'https://cdn.freesound.org/previews/464/464527_7890039-lq.mp3',
  land: 'https://cdn.freesound.org/previews/422/422753_6616210-lq.mp3',
  pickup: 'https://cdn.freesound.org/previews/822/822564_71257-lq.mp3',
  hurt: 'https://cdn.freesound.org/previews/842/842186_13307919-lq.mp3',
  door: 'https://cdn.freesound.org/previews/842/842186_13307919-lq.mp3',
  ambience: 'https://cdn.freesound.org/previews/638/638895_11418394-lq.mp3',
};

const SR = 44100;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.ambienceNodes = {};
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.initialized = false;
  }

  _generateNoiseBuffer(duration, lowFreq, highFreq, seed) {
    const len = Math.floor(SR * duration);
    const buf = this.ctx.createBuffer(1, len, SR);
    const data = buf.getChannelData(0);
    let s = seed || 0;
    let lp = 0;
    const flc = 2 * Math.PI * (lowFreq || 80) / SR;
    const fhc = 2 * Math.PI * (highFreq || 200) / SR;
    for (let i = 0; i < len; i++) {
      s = (s * 16807 + 0) % 2147483647;
      const white = (s / 2147483647) * 2 - 1;
      lp += (white - lp) * fhc;
      data[i] = lp;
    }
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Math.abs(data[i]);
    const avg = sum / len;
    if (avg > 0.001) {
      const scale = 0.35 / avg;
      for (let i = 0; i < len; i++) data[i] *= scale;
    }
    return buf;
  }

  _generateFootstepBuffers() {
    for (let i = 0; i < 4; i++) {
      const len = Math.floor(SR * 0.2);
      const buf = this.ctx.createBuffer(1, len, SR);
      const data = buf.getChannelData(0);
      let s = (i * 12345 + 67890) % 2147483647;
      let lp = 0;
      const fc = 2 * Math.PI * (80 + i * 20) / SR;
      for (let j = 0; j < len; j++) {
        s = (s * 16807 + 0) % 2147483647;
        const white = (s / 2147483647) * 2 - 1;
        lp += (white - lp) * fc;
        const t = j / SR;
        const env = Math.exp(-t * 25);
        data[j] = lp * env;
      }
      let peak = 0;
      for (let j = 0; j < len; j++) {
        const a = Math.abs(data[j]);
        if (a > peak) peak = a;
      }
      if (peak > 0.001) {
        const scale = 0.4 / peak;
        for (let j = 0; j < len; j++) data[j] *= scale;
      }
      this.buffers[`footstep_${i}`] = buf;
    }
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = 0.5;
      this.ambienceGain.connect(this.masterGain);

      this.initialized = true;
      this._generateFootstepBuffers();
      this._loadPromise = this._loadSounds();
    } catch (e) {
      console.warn('AudioManager: Web Audio not available');
    }
  }

  async _loadSounds() {
    const promises = Object.entries(SOUND_URLS).map(async ([name, url]) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        this.buffers[name] = await this.ctx.decodeAudioData(buf);
      } catch (e) {
        console.warn(`AudioManager: failed to load "${name}"`);
      }
    });
    await Promise.all(promises);
  }

  _ensureResumed() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name) {
    if (!this.initialized) return;
    this._ensureResumed();

    switch (name) {
      case 'footstep':
        this._playFootstep(0.95 + Math.random() * 0.1, 0.65);
        break;
      case 'footstep_run':
        this._playFootstep(1.1 + Math.random() * 0.15, 1.0);
        break;
      case 'flashlight':
        this._playBuffer('flashlight', 1, 0.8);
        break;
      case 'jump':
        this._playBuffer('jump', 1, 0.6);
        break;
      case 'land':
        this._playBuffer('land', 0.8 + Math.random() * 0.3, 0.5);
        break;
      case 'pickup':
        this._playBuffer('pickup', 1, 0.7);
        break;
      case 'hurt':
        this._playHurt();
        break;
      case 'door':
        this._playDoor();
        break;
    }
  }

  _playBuffer(name, pitch, vol) {
    const buf = this.buffers[name];
    if (!buf) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = pitch;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + buf.duration / pitch);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(0);
  }

  _playFootstep(pitch, vol) {
    const i = Math.floor(Math.random() * 4);
    const key = `footstep_${i}`;
    const buf = this.buffers[key];
    if (!buf) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = pitch;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const vVar = 0.8 + Math.random() * 0.4;
    gain.gain.setValueAtTime(vol * vVar, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 / pitch);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300 + Math.random() * 400;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(0);
  }

  _playHurt() {
    const buf = this.buffers.hurt;
    if (!buf) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = 0.4;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(0);
  }

  _playDoor() {
    const buf = this.buffers.door;
    if (!buf) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = 0.6;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(0);
  }

  async playAmbience(name) {
    if (!this.initialized) return;
    this._ensureResumed();
    if (this.ambienceNodes[name]) return;

    if (name === 'level0') {
      await this._loadPromise;
      if (!this.buffers.ambience) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers.ambience;
      source.loop = true;
      source.connect(this.ambienceGain);
      source.start(0);
      this.ambienceNodes[name] = { source };
    }
  }

  stopAmbience(name) {
    const node = this.ambienceNodes[name];
    if (node) {
      node.source.stop();
      if (node.lfo) node.lfo.stop();
      delete this.ambienceNodes[name];
    }
  }

  setMasterVolume(vol) {
    if (this.masterGain) this.masterGain.gain.value = vol;
  }

  dispose() {
    for (const name of Object.keys(this.ambienceNodes)) this.stopAmbience(name);
    if (this.ctx) this.ctx.close();
  }
}
