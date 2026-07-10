import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;
const FOOTER_H = 0.12;

const GW = 80;
const GH = 60;

const SECTORS = [
  [0, 0, GW, 2, 'hall'],
  [0, 58, GW, 2, 'hall'],
  [4, 2, 15, 17, 'spawn'],
  [4, 2, 3, 17, 'hall'],
  [16, 2, 3, 17, 'hall'],
  [22, 2, 33, 17, 'room'],
  [26, 5, 2, 2, ' '], [30, 5, 2, 2, ' '], [34, 5, 2, 2, ' '],
  [38, 5, 2, 2, ' '], [42, 5, 2, 2, ' '], [46, 5, 2, 2, ' '], [50, 5, 2, 2, ' '],
  [26, 10, 2, 2, ' '], [30, 10, 2, 2, ' '], [34, 10, 2, 2, ' '],
  [38, 10, 2, 2, ' '], [42, 10, 2, 2, ' '], [46, 10, 2, 2, ' '], [50, 10, 2, 2, ' '],
  [26, 15, 2, 2, ' '], [30, 15, 2, 2, ' '], [34, 15, 2, 2, ' '],
  [38, 15, 2, 2, ' '], [42, 15, 2, 2, ' '], [46, 15, 2, 2, ' '], [50, 15, 2, 2, ' '],
  [58, 2, 20, 17, 'room'],
  [4, 22, 6, 5, 'room'], [12, 22, 5, 5, 'room'],
  [4, 29, 6, 5, 'room'], [12, 29, 5, 5, 'room'],
  [4, 36, 6, 4, 'room'], [12, 36, 5, 4, 'room'],
  [10, 22, 2, 5, 'hall'], [10, 29, 2, 5, 'hall'], [10, 36, 2, 4, 'hall'],
  [4, 27, 6, 2, 'hall'], [12, 27, 5, 2, 'hall'],
  [4, 34, 6, 2, 'hall'], [12, 34, 5, 2, 'hall'],
  [22, 22, 33, 3, 'hall'], [22, 22, 3, 17, 'hall'],
  [52, 22, 3, 17, 'hall'], [22, 36, 33, 3, 'hall'],
  [28, 25, 3, 13, 'hall'], [46, 25, 3, 13, 'hall'],
  [28, 25, 21, 3, 'hall'], [28, 35, 21, 3, 'hall'],
  [31, 28, 15, 7, 'room'],
  [25, 28, 6, 7, 'hall'], [41, 28, 11, 7, 'hall'],
  [31, 25, 15, 3, 'hall'], [31, 33, 15, 3, 'hall'],
  [58, 22, 20, 17, 'room'],
  [4, 44, 5, 5, 'room'], [12, 44, 5, 5, 'room'],
  [4, 51, 5, 6, 'room'], [12, 51, 5, 6, 'room'],
  [9, 44, 3, 5, 'hall'], [9, 51, 3, 6, 'hall'],
  [4, 49, 5, 2, 'hall'], [12, 49, 5, 2, 'hall'],
  [22, 42, 16, 16, 'room'], [40, 42, 14, 16, 'room'],
  [22, 42, 4, 16, 'hall'], [36, 42, 4, 16, 'hall'],
  [22, 50, 18, 2, 'hall'],
  [58, 42, 20, 16, 'exit'],
  [19, 8, 3, 5, 'hall'], [55, 8, 3, 5, 'hall'],
  [19, 28, 3, 5, 'hall'], [55, 28, 3, 5, 'hall'],
  [19, 48, 3, 5, 'hall'], [55, 48, 3, 5, 'hall'],
  [28, 19, 5, 3, 'hall'], [48, 19, 5, 3, 'hall'],
  [28, 39, 5, 3, 'hall'], [48, 39, 5, 3, 'hall'],
  [66, 19, 5, 3, 'hall'], [66, 39, 5, 3, 'hall'],
  [26, 48, 6, 2, 'hall'], [44, 46, 6, 2, 'hall'],
  [62, 2, 4, 16, 'hall'], [62, 22, 4, 16, 'hall'],
  [70, 2, 4, 16, 'hall'], [70, 22, 4, 16, 'hall'],
  [38, 46, 2, 2, ' '], [46, 46, 2, 2, ' '],
];

const ITEM_PLACEMENTS = [
  ['flashlight', 8, 6], ['almond_water', 12, 6], ['almond_water', 10, 10],
  ['almond_water', 42, 6], ['almond_water', 30, 12],
  ['batteries', 14, 4], ['batteries', 7, 14], ['batteries', 36, 6], ['batteries', 46, 10],
  ['lighter', 14, 14], ['lighter', 66, 8],
  ['medkit', 26, 12], ['medkit', 44, 26], ['medkit', 72, 46],
  ['note', 16, 24], ['note', 36, 30], ['note', 8, 46], ['note', 68, 28], ['note', 28, 52],
  ['key', 74, 50], ['key', 50, 54],
];

const ITEM_MODEL_MAP = {
  almond_water: 'water_bottle.glb', flashlight: 'flashlight.glb',
  batteries: '__procedural_battery', lighter: 'lighter.glb',
  medkit: 'firstaid.glb', key: 'key.glb', note: 'papers.glb',
};

const ITEM_SCALES = {
  almond_water: 0.003,         // raw 68.6 → 0.206m tall
  flashlight: 0.25,            // raw 0.61 → 0.153m long
  lighter: 0.0004,             // raw 206 → 0.082m
  medkit: 25,                  // raw 0.004 → 0.1m
  key: 0.14,                   // raw 0.5 → 0.07m
  note: 0.002,                 // raw 171 → 0.342m wide
};

const FURNITURE_SCALES = {
  filing_cabinet: 1.3,         // raw 0.978 → 1.27m tall
};

const FURNITURE_MODEL_MAP = {
  filing_cabinet: 'filing_cabinet.glb', water_cooler: 'water_cooler.glb',
};

const _id = (() => { let i = 0; return () => i++; })();

function _makeMat(name, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    roughness: 0.85, metalness: 0, ...opts,
  });
  m.name = name;
  return m;
}

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3((10 + 0.5) * TILE, 0, (10 + 0.5) * TILE);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.grid = null;
    this.textures = {};
    this.models = {};
    this._walkableTiles = [];
  }

  _initGrid() {
    this.grid = Array.from({ length: GH }, () => Array(GW).fill(' '));
    for (const [x, z, w, h, type] of SECTORS) {
      for (let dz = 0; dz < h; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = x + dx, cz = z + dz;
          if (cx >= 0 && cx < GW && cz >= 0 && cz < GH) {
            if (type === 'spawn') this.grid[cz][cx] = 'S';
            else if (type === 'exit') this.grid[cz][cx] = 'E';
            else this.grid[cz][cx] = type === ' ' ? ' ' : type === 'hall' ? '.' : 'r';
          }
        }
      }
    }
    this._walkableTiles = [];
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] !== ' ') this._walkableTiles.push({ x, z });
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
    this._initGrid();
    this.textureLoader = new THREE.TextureLoader();
    this.spawnPoint = this._findSpawnPoint();
    await this._loadAssets();
    this._buildLevel();
  }

  _findSpawnPoint() {
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] === 'S')
          return new THREE.Vector3((x + 0.5) * TILE, 0, (z + 0.5) * TILE);
    return new THREE.Vector3(5 * TILE, 0, 5 * TILE);
  }

  async _loadAssets() {
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';
    const loadTex = (key, path, rx, ry) => {
      const t = this.textureLoader.load(`${base}/assets/textures/${path}`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      this.textures[key] = t;
    };
    loadTex('floorDiff', 'backrooms-level-0/backrooms-carpet-diffuse.png', 3, 3);
    loadTex('floorNorm', 'backrooms-level-0/backrooms-carpet-normal.png', 3, 3);
    loadTex('wallDiff', 'backrooms-level-0/backrooms-wall-diffuse.png', 2, 2);
    loadTex('wallNor', 'backrooms-level-0/backrooms-wall-normal.png', 2, 2);
    loadTex('ceilDiff', 'backrooms-level-0/backrooms-ceiling-tile-diffuse.png', 3, 3);
    loadTex('ceilNor', 'backrooms-level-0/backrooms-ceiling-tile-normal.png', 3, 3);
    loadTex('ceilRough', 'backrooms-level-0/backrooms-ceiling-tile-roughness.png', 3, 3);
    loadTex('fixtureDiff', 'backrooms-level-0/backrooms-ceiling-light-diffuse.png', 1, 1);
    loadTex('fixtureEmit', 'backrooms-level-0/backrooms-ceiling-light-emission.png', 1, 1);

    const loadModel = (key, filename) => new Promise(resolve => {
      const loader = new GLTFLoader();
      loader.load(
        `${base}/assets/models/${filename}`,
        gltf => { this.models[key] = gltf.scene; resolve(); },
        undefined,
        () => { this.models[key] = new THREE.Group(); resolve(); }
      );
    });

    const modelPromises = [];
    const seen = new Set();

    // Load old item models (for pickup items)
    for (const key of Object.values(ITEM_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!seen.has(name)) { seen.add(name); modelPromises.push(loadModel(name, key)); }
    }

    // Load furniture models (filing_cabinet, water_cooler)
    for (const key of Object.values(FURNITURE_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!seen.has(name)) { seen.add(name); modelPromises.push(loadModel(name, key)); }
    }

    await Promise.all(modelPromises);
  }

  unload() {
    if (this.object3d.parent) this.object3d.parent.remove(this.object3d);
    this.object3d.traverse(c => {
      if (c.isMesh) {
        c.geometry.dispose();
        (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
      }
    });
  }

  _buildLevel() {
    this._buildUnderFloor();
    this._buildFloor();
    this._buildCeiling();
    this._buildWalls();
    this._createLights();
    this._createProps();
    this._createItems();
    this._createExit();
  }

  _isWalkable(x, z) {
    return x >= 0 && x < GW && z >= 0 && z < GH && this.grid[z][x] !== ' ';
  }

  _buildUnderFloor() {
    const mat = _makeMat('underfloor', { color: 0x222222, roughness: 1, metalness: 0 });
    const geom = new THREE.PlaneGeometry(GW * TILE, GH * TILE);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(GW * TILE / 2, -0.1, GH * TILE / 2);
    mesh.renderOrder = -1;
    this.object3d.add(mesh);
  }

  _buildFloor() {
    const mat = _makeMat('floor', {
      map: this.textures.floorDiff, normalMap: this.textures.floorNorm,
      roughness: 0.9,
    });
    const geom = new THREE.PlaneGeometry(TILE, TILE);
    const count = this._walkableTiles.length;
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const { x, z } = this._walkableTiles[i];
      dummy.position.set(x * TILE + TILE / 2, 0, z * TILE + TILE / 2);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    this.object3d.add(mesh);
  }

  _buildCeiling() {
    const mat = _makeMat('ceiling', {
      map: this.textures.ceilDiff, normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough, color: 0xeee8e0,
    });
    const geom = new THREE.PlaneGeometry(TILE, TILE);
    const count = this._walkableTiles.length;
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const { x, z } = this._walkableTiles[i];
      dummy.position.set(x * TILE + TILE / 2, ROOM_H, z * TILE + TILE / 2);
      dummy.rotation.x = Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.object3d.add(mesh);
  }

  _buildWalls() {
    const wallMat = _makeMat('wall', {
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85,
    });
    const footerMat = _makeMat('footer', {
      map: this.textures.wallDiff, roughness: 0.8, color: 0x887755,
    });

    const wallGeomsX = [];
    const wallGeomsZ = [];
    const footerGeomsX = [];
    const footerGeomsZ = [];

    const addWall = (px, pz, w, d, isX) => {
      const wg = new THREE.BoxGeometry(w, ROOM_H - FOOTER_H, d);
      wg.translate(px, FOOTER_H / 2 + (ROOM_H - FOOTER_H) / 2, pz);
      (isX ? wallGeomsX : wallGeomsZ).push(wg);
      const fg = new THREE.BoxGeometry(w + d, FOOTER_H, d + 0.02);
      fg.translate(px, FOOTER_H / 2, pz);
      (isX ? footerGeomsX : footerGeomsZ).push(fg);
    };

    for (const { x, z } of this._walkableTiles) {
      const cx = x * TILE + TILE / 2, cz = z * TILE + TILE / 2;
      if (z === 0 || !this._isWalkable(x, z - 1))
        addWall(cx, z * TILE, TILE, WALL_T, true);
      if (z === GH - 1 || !this._isWalkable(x, z + 1))
        addWall(cx, z * TILE + TILE, TILE, WALL_T, true);
      if (x === 0 || !this._isWalkable(x - 1, z))
        addWall(x * TILE, cz, WALL_T, TILE, false);
      if (x === GW - 1 || !this._isWalkable(x + 1, z))
        addWall(x * TILE + TILE, cz, WALL_T, TILE, false);
    }

    const merge = (geoms, mat) => {
      if (geoms.length === 0) return;
      const merged = mergeGeoms(geoms);
      const mesh = new THREE.Mesh(merged, mat);
      this.object3d.add(mesh);
    };

    merge(wallGeomsX, wallMat);
    merge(wallGeomsZ, wallMat);
    merge(footerGeomsX, footerMat);
    merge(footerGeomsZ, footerMat);
  }

  _createLights() {
    const ambient = new THREE.AmbientLight(0xffdd99, 0.5);
    this.object3d.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff0d0, 0x887755, 0.4);
    this.object3d.add(hemi);

    const dir = new THREE.DirectionalLight(0xffdd88, 0.35);
    dir.position.set(0, 10, 0);
    this.object3d.add(dir);

    const fixtureMat = _makeMat('fixture', {
      map: this.textures.fixtureDiff, roughness: 0.4, metalness: 0,
      emissiveMap: this.textures.fixtureEmit, emissive: 0xffe8bb, emissiveIntensity: 3.0,
    });

    const fGeom = new THREE.BoxGeometry(1.6, 0.05, 0.25);
    const positions = [];

    for (let z = 2; z < GH - 1; z += 6) {
      for (let x = 2; x < GW - 1; x += 6) {
        if (!this._isWalkable(x, z)) continue;
        positions.push({ x: x * TILE + TILE / 2, z: z * TILE + TILE / 2 });
      }
    }

    if (positions.length > 0) {
      const fMesh = new THREE.InstancedMesh(fGeom, fixtureMat, positions.length);
      const d = new THREE.Object3D();
      for (let i = 0; i < positions.length; i++) {
        d.position.set(positions[i].x, ROOM_H - 0.025, positions[i].z);
        d.updateMatrix();
        fMesh.setMatrixAt(i, d.matrix);
      }
      fMesh.instanceMatrix.needsUpdate = true;
      this.object3d.add(fMesh);
    }
  }

  _cloneModel(key) {
    const src = this.models[key];
    if (!src || src.children.length === 0) return new THREE.Group();
    const clone = src.clone(true);
    clone.traverse(c => {
      if (!c.isMesh) return;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m.map) {
          m.color.setHex(0xddd0c0);
          m.roughness = 0.85;
          m.metalness = 0;
        }
      }
    });
    return clone;
  }

  _createProps() {
    const cells = [];
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] === 'r') cells.push({ x, z });

    if (cells.length === 0) return;

    const cabMat = _makeMat('cabinet', { color: 0x887766, roughness: 0.7, metalness: 0.1 });

    for (let i = 0; i < Math.min(6, cells.length); i++) {
      const cell = cells[(i * 7 + 3) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i % 3) - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i * 2 + 1) % 3 - 1) * 0.8;
      const cab = this._cloneModel('filing_cabinet');
      cab.position.set(cx, 0, cz);
      cab.rotation.y = i * 1.2;
      cab.scale.setScalar(FURNITURE_SCALES.filing_cabinet);
      this.object3d.add(cab);
    }

    // Procedural shelves (shelf.glb was corrupted)
    const shelfMat = _makeMat('shelf', { color: 0x9a8c7a, roughness: 0.6, metalness: 0.05 });
    for (let i = 0; i < Math.min(6, cells.length); i++) {
      const cell = cells[(i * 11 + 5) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i * 3) % 3 - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i + 5) % 3 - 1) * 0.8;
      const group = new THREE.Group();
      for (const sx of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), shelfMat);
        leg.position.set(sx, 0.8, 0);
        group.add(leg);
      }
      for (let j = 0; j < 4; j++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.4), shelfMat);
        board.position.set(0, j * 0.4 + 0.2, 0);
        group.add(board);
      }
      group.position.set(cx, 0, cz);
      group.rotation.y = i * 0.9;
      this.object3d.add(group);
    }

    for (let i = 0; i < Math.min(3, cells.length); i++) {
      const cell = cells[(i * 13 + 7) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i * 2) % 3 - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i + 5) % 3 - 1) * 0.8;
      const cooler = this._cloneModel('water_cooler');
      cooler.position.set(cx, 0, cz);
      cooler.rotation.set(-Math.PI / 2, i * 1.5, 0);
      cooler.scale.setScalar(0.1);
      this.object3d.add(cooler);
    }
  }

  _spawnItem(type, x, z) {
    const modelKey = ITEM_MODEL_MAP[type];
    if (!modelKey) return;

    let mesh;
    if (modelKey === '__procedural_battery') {
      const mat = _makeMat('battery', { color: 0xcc3333, metalness: 0.4, roughness: 0.3 });
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.08, 8), mat);
    } else {
      mesh = this._cloneModel(modelKey.replace('.glb', ''));
      const s = ITEM_SCALES[type];
      if (s) mesh.scale.setScalar(s);
    }

    mesh.position.set(x, 0.05, z);
    this.object3d.add(mesh);
    this.interactables.push({ mesh, type, position: new THREE.Vector3(x, 0.1, z) });
  }

  _createItems() {
    for (const [type, gx, gz] of ITEM_PLACEMENTS)
      this._spawnItem(type, gx * TILE + TILE / 2, gz * TILE + TILE / 2);
  }

  _createExit() {
    const px = 75 * TILE + TILE / 2, pz = 56 * TILE + TILE / 2;
    const doorMat = _makeMat('door', { map: this.textures.wallDiff });
    const frameMat = _makeMat('frame', { map: this.textures.wallDiff, roughness: 0.6, metalness: 0.1, color: 0x887755 });
    const barMat = _makeMat('bar', { color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const signMat = _makeMat('sign', { map: this.textures.ceilEmit, color: 0xcc3333, emissive: 0xcc2222, emissiveIntensity: 0.6, roughness: 0.3 });
    const signGlowMat = _makeMat('signGlow', { color: 0xffeedd, emissive: 0xffaa66, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.12), frameMat);
    frame.position.set(px, 1.3, pz); this.object3d.add(frame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.08), doorMat);
    door.position.set(px, 1.15, pz + 0.02); this.object3d.add(door);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.03), barMat);
    pushBar.position.set(px, 1.0, pz + 0.07); this.object3d.add(pushBar);

    for (const hz of [0.3, -0.3]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), barMat);
      bar.position.set(px + hz * 0.5 / 0.3, 1.0, pz + 0.07);
      bar.rotation.x = Math.PI / 2;
      this.object3d.add(bar);
    }

    const hingeMat = _makeMat('hinge', { color: 0x666666, metalness: 0.6, roughness: 0.3 });
    for (const hz of [0.3, -0.3]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), hingeMat);
      hinge.position.set(px - 0.56, hz + 1.15, pz + 0.02);
      this.object3d.add(hinge);
    }

    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.03), signMat);
    signBox.position.set(px, 2.6, pz + 0.06); this.object3d.add(signBox);

    const glowBg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.002), signGlowMat);
    glowBg.position.set(px, 2.6, pz + 0.075); this.object3d.add(glowBg);

    this.interactables.push({ mesh: door, type: 'exit', position: new THREE.Vector3(px, 1.2, pz) });
  }

  getCollisionGrid() { return this.grid; }
  getWallColliders() { return []; }

  update(delta) {
  }

  getInteractables() { return this.interactables; }
}

function mergeGeoms(geoms) {
  if (geoms.length === 1) return geoms[0];
  let totalVerts = 0, totalIdx = 0;
  for (const g of geoms) {
    totalVerts += g.getAttribute('position').count;
    totalIdx += g.index ? g.index.count : g.getAttribute('position').count;
  }
  const pos = new Float32Array(totalVerts * 3);
  const nrm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const idx = new Uint32Array(totalIdx);
  let vo = 0, io = 0;
  for (const g of geoms) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    const gi = g.index;
    const count = p.count;
    pos.set(p.array, vo * 3);
    nrm.set(n.array, vo * 3);
    uv.set(u.array, vo * 2);
    if (gi) {
      for (let k = 0; k < gi.count; k++) idx[io + k] = gi.array[k] + vo;
      io += gi.count;
    } else {
      for (let k = 0; k < count; k++) idx[io + k] = vo + k;
      io += count;
    }
    vo += count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  merged.computeVertexNormals();
  return merged;
}
