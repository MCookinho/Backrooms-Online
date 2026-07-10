const SOUND_URLS = {
  footstep: 'https://cdn.freesound.org/previews/474/474051_3248005-lq.mp3',
  flashlight: 'https://cdn.freesound.org/previews/502/502506_4921277-lq.mp3',
  ambience: 'https://cdn.freesound.org/previews/638/638895_11418394-lq.mp3',
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.ambienceNodes = {};
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.initialized = false;
    this._footstepStep = 0;
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
      this.ambienceGain.gain.value = 0.4;
      this.ambienceGain.connect(this.masterGain);

      this.initialized = true;
      this._loadSounds();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  async _loadSounds() {
    for (const [name, url] of Object.entries(SOUND_URLS)) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        this.buffers[name] = await this.ctx.decodeAudioData(buf);
      } catch (e) {
        console.warn(`Audio load failed for "${name}":`, e);
      }
    }
  }

  _ensureResumed() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name) {
    if (!this.initialized) return;
    this._ensureResumed();

    switch (name) {
      case 'footstep':
        this._playFootstep();
        break;
      case 'footstep_run':
        this._playFootstep(1.2);
        break;
      case 'flashlight':
        this._playFromBuffer('flashlight');
        break;
      case 'jump':
        this._synthJump();
        break;
      case 'land':
        this._playFootstep(0.8);
        break;
      case 'pickup':
        this._synthTone(800, 0.1, 'sine', 0.3);
        break;
      case 'hurt':
        this._synthTone(200, 0.2, 'sawtooth', 0.4);
        break;
      case 'door':
        this._synthNoise(0.15, 0.3);
        break;
    }
  }

  _playFootstep(pitchMul = 1) {
    const buf = this.buffers.footstep;
    if (buf) {
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const dur = buf.duration;
      const start = Math.random() * (dur - 0.5);
      source.start(0, start, 0.25);
      source.playbackRate.value = 0.9 + Math.random() * 0.2 * pitchMul;

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      source.connect(gain);
      gain.connect(this.sfxGain);
    } else {
      this._synthFootstep();
    }
  }

  _playFromBuffer(name) {
    const buf = this.buffers[name];
    if (!buf) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + buf.duration);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(0);
  }

  _synthFootstep() {
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    const bufSize = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    noise.buffer = buf;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200 + Math.random() * 300;

    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 80 + Math.random() * 40;
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.4, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(lp);
    lp.connect(ng);
    ng.connect(this.sfxGain);
    thump.connect(tg);
    tg.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.12);
    thump.start(now);
    thump.stop(now + 0.07);
  }

  _synthJump() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  _synthTone(freq, dur, type, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur);
  }

  _synthNoise(dur, vol) {
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
  }

  playAmbience(name) {
    if (!this.initialized) return;
    this._ensureResumed();
    if (this.ambienceNodes[name]) return;

    if (name === 'level0') {
      const buf = this.buffers.ambience;
      if (buf) {
        const source = this.ctx.createBufferSource();
        source.buffer = buf;
        source.loop = true;
        source.connect(this.ambienceGain);
        source.start(0);
        this.ambienceNodes[name] = { source };
      } else {
        this._createSynthAmbience(name);
      }
    }
  }

  _createSynthAmbience(name) {
    const dur = 2;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / this.ctx.sampleRate;
      const hum = Math.sin(2 * Math.PI * 60 * t) * 0.3;
      const buzz = Math.sin(2 * Math.PI * 120 * t) * 0.15;
      const flicker = Math.sin(2 * Math.PI * 3 * t) * 0.5 + 0.5;
      data[i] = (hum + buzz) * (0.3 + flicker * 0.2) * 0.3;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
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
    source.start(0);
    lfo.start(0);
    this.ambienceNodes[name] = { source, filter, lfo };
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
