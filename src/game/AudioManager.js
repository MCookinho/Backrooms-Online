const SOUND_URLS = {
  footstep_0: 'https://cdn.freesound.org/previews/843/843634_14469752-lq.mp3',
  footstep_1: 'https://cdn.freesound.org/previews/843/843635_14469752-lq.mp3',
  footstep_2: 'https://cdn.freesound.org/previews/843/843636_14469752-lq.mp3',
  footstep_3: 'https://cdn.freesound.org/previews/843/843637_14469752-lq.mp3',
  flashlight: 'https://cdn.freesound.org/previews/502/502506_4921277-lq.mp3',
  jump: 'https://cdn.freesound.org/previews/464/464527_7890039-lq.mp3',
  land: 'https://cdn.freesound.org/previews/422/422753_6616210-lq.mp3',
  pickup: 'https://cdn.freesound.org/previews/822/822564_71257-lq.mp3',
  hurt: 'https://cdn.freesound.org/previews/842/842186_13307919-lq.mp3',
  door: 'https://cdn.freesound.org/previews/842/842186_13307919-lq.mp3',
  ambience: 'https://cdn.freesound.org/previews/638/638895_11418394-lq.mp3',
};

const FOOTSTEP_VARIANTS = ['footstep_0', 'footstep_1', 'footstep_2', 'footstep_3'];

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

    const buf = this.buffers[name];
    if (!buf) return;

    switch (name) {
      case 'footstep':
        this._playFootstep(0.9 + Math.random() * 0.25, 1.0);
        break;
      case 'footstep_run':
        this._playFootstep(1.3 + Math.random() * 0.3, 1.4);
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
    const key = FOOTSTEP_VARIANTS[Math.floor(Math.random() * FOOTSTEP_VARIANTS.length)];
    const buf = this.buffers[key];
    if (!buf) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = pitch;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = 120;
    filter.Q.value = 1.5;
    filter.gain.value = 5;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + buf.duration / pitch);
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
