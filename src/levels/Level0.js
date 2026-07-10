import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;

const GW = 60;
const GH = 30;

const SECTORS = [
  [22, 11, 4, 3, 'spawn'],
  [5, 13, 48, 1, 'hall'],
  [3, 13, 2, 1, 'hall'],
  [23, 6, 1, 7, 'hall'],
  [22, 4, 3, 2, 'room'],
  [30, 7, 1, 6, 'hall'],
  [29, 5, 3, 2, 'room'],
  [13, 7, 1, 6, 'hall'],
  [12, 5, 3, 2, 'room'],
  [23, 14, 1, 10, 'hall'],
  [22, 24, 3, 2, 'room'],
  [30, 14, 1, 8, 'hall'],
  [29, 22, 3, 2, 'room'],
  [13, 14, 1, 8, 'hall'],
  [12, 22, 3, 2, 'room'],
  [47, 13, 6, 1, 'hall'],
  [50, 10, 3, 3, 'room'],
  [53, 12, 3, 3, 'exit'],
  [17, 9, 1, 4, 'hall'],
  [17, 14, 1, 4, 'hall'],
  [1, 12, 2, 3, 'room'],
  [42, 3, 3, 3, 'room'],
  [43, 6, 1, 3, 'hall'],
  [37, 7, 1, 6, 'hall'],
  [37, 6, 1, 1, 'hall'],
  [37, 5, 2, 1, 'room'],
  [38, 14, 1, 5, 'hall'],
  [37, 19, 3, 2, 'room'],
  [7, 15, 1, 3, 'hall'],
  [7, 14, 1, 1, 'hall'],
  [6, 18, 3, 2, 'room'],
  [43, 9, 1, 4, 'hall'],
];

const ITEM_PLACEMENTS = [
  ['flashlight', 14, 5],
  ['almond_water', 13, 5],
  ['almond_water', 30, 5],
  ['almond_water', 23, 24],
  ['almond_water', 29, 22],
  ['batteries', 10, 13],
  ['batteries', 33, 13],
  ['batteries', 23, 14],
  ['lighter', 37, 5],
  ['lighter', 50, 10],
  ['medkit', 22, 4],
  ['medkit', 39, 19],
  ['note', 12, 22],
  ['note', 42, 3],
  ['note', 25, 11],
  ['key', 51, 13],
];

const ENTITY_PLACEMENTS = [
  ['hound', 30, 14, { speed: 1.8, aggroRange: 8, damage: 12, patrolRadius: 4 }],
  ['hound', 8, 13, { speed: 1.6, aggroRange: 7, damage: 15, patrolRadius: 3 }],
  ['faceling', 12, 5, { speed: 0.9, aggroRange: 5, damage: 8, patrolRadius: 3 }],
  ['faceling', 29, 22, { speed: 1.0, aggroRange: 6, damage: 10, patrolRadius: 4 }],
  ['faceling', 38, 14, { speed: 0.8, aggroRange: 5, damage: 8, patrolRadius: 3 }],
  ['duller', 50, 10, {}],
  ['duller', 6, 18, {}],
];

const ITEM_MODEL_MAP = {
  almond_water: 'water_bottle.glb',
  flashlight: 'flashlight.glb',
  batteries: 'battery.glb',
  lighter: 'lighter.glb',
  medkit: 'firstaid.glb',
  key: 'key.glb',
  note: 'papers.glb',
};

const FURNITURE_MODEL_MAP = {
  filing_cabinet: 'filing_cabinet.glb',
  shelf: 'shelf.glb',
  water_cooler: 'water_cooler.glb',
};

const THREAT_MODEL_MAP = {
  hound: 'dog.glb',
  faceling: 'human.glb',
  duller: 'human.glb',
};

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3((23 + 0.5) * TILE, 0, (12 + 0.5) * TILE);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.wallBoxes = [];
    this.entities = [];
    this.grid = null;
    this.textures = {};
    this.models = {};
  }

  _initGrid() {
    this.grid = Array.from({ length: GH }, () => Array(GW).fill(' '));
    for (const [x, z, w, h, type] of SECTORS) {
      for (let dz = 0; dz < h; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = x + dx;
          const cz = z + dz;
          if (cx >= 0 && cx < GW && cz >= 0 && cz < GH) {
            if (type === 'spawn') this.grid[cz][cx] = 'S';
            else if (type === 'exit') this.grid[cz][cx] = 'E';
            else this.grid[cz][cx] = type === 'hall' ? '.' : 'r';
          }
        }
      }
    }
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
    this._initGrid();
    this.textureLoader = new THREE.TextureLoader();
    await this._loadAssets();
    this._buildLevel();
  }

  async _loadAssets() {
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';

    const loadTex = (key, path, rx, ry) => {
      const t = this.textureLoader.load(`${base}/assets/textures/${path}`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      this.textures[key] = t;
    };

    loadTex('carpetDiff', "yasu/Yasu's_Backrooms_Material_Pack/Floors/Backrooms_Carpet_01_Color.jpg", 12, 12);
    loadTex('carpetNorm', "yasu/Yasu's_Backrooms_Material_Pack/Floors/Backrooms_Carpet_01_Normal.jpg", 12, 12);
    loadTex('carpetRough', "yasu/Yasu's_Backrooms_Material_Pack/Floors/Backrooms_Carpet_01_Roughness.jpg", 12, 12);
    loadTex('wallDiff', "yasu/Yasu's_Backrooms_Material_Pack/Walls/Backrooms_Wallpaper_01_Color.jpg", 2, 2);
    loadTex('wallNor', "yasu/Yasu's_Backrooms_Material_Pack/Walls/Backrooms_Wallpaper_01_Normal.jpg", 2, 2);
    loadTex('wallRough', "yasu/Yasu's_Backrooms_Material_Pack/Walls/Backrooms_Wallpaper_01_Roughness.jpg", 2, 2);
    loadTex('ceilDiff', "yasu/Yasu's_Backrooms_Material_Pack/Ceilings/Backrooms_Ceiling_01_Color.jpg", 4, 4);
    loadTex('ceilNor', "yasu/Yasu's_Backrooms_Material_Pack/Ceilings/Backrooms_Ceiling_01_Normal.jpg", 4, 4);
    loadTex('ceilRough', "yasu/Yasu's_Backrooms_Material_Pack/Ceilings/Backrooms_Ceiling_01_Roughness.jpg", 4, 4);
    loadTex('lightDiff', 'backrooms/backrooms-ceiling-light-diffuse.png', 1, 1);
    loadTex('lightEmit', 'backrooms/backrooms-ceiling-light-emission.png', 1, 1);
    loadTex('lightNor', 'backrooms/backrooms-ceiling-light-normal.png', 1, 1);
    loadTex('lightRough', 'backrooms/backrooms-ceiling-light-roughness.png', 1, 1);

    const loadModel = (key, filename) => {
      return new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.load(
          `${base}/assets/models/${filename}`,
          (gltf) => { this.models[key] = gltf.scene; resolve(); },
          undefined,
          () => { this.models[key] = new THREE.Group(); resolve(); }
        );
      });
    };

    const modelPromises = [];
    for (const key of Object.values(ITEM_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!this.models[name]) modelPromises.push(loadModel(name, key));
    }
    for (const key of Object.values(FURNITURE_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!this.models[name]) modelPromises.push(loadModel(name, key));
    }
    for (const key of Object.values(THREAT_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!this.models[name]) modelPromises.push(loadModel(name, key));
    }

    await Promise.all(modelPromises);
  }

  unload() {
    if (this.object3d.parent) this.object3d.parent.remove(this.object3d);
    this._disposeGroup(this.object3d);
  }

  _disposeGroup(g) {
    g.traverse(c => {
      if (c.isMesh) {
        c.geometry.dispose();
        if (c.material) {
          (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
        }
      }
    });
  }

  _buildLevel() {
    this._buildFloor();
    this._buildCeiling();
    this._buildWalls();
    this._buildTrim();
    this._createLights();
    this._addWallDetails();
    this._createProps();
    this._createItems();
    this._placeEntities();
    this._createExit();
  }

  _isWalkable(x, z) {
    if (x < 0 || x >= GW || z < 0 || z >= GH) return false;
    return this.grid[z][x] !== ' ';
  }

  _buildFloor() {
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.carpetDiff,
      normalMap: this.textures.carpetNorm,
      roughnessMap: this.textures.carpetRough,
      roughness: 0.85,
      metalness: 0,
    });

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE, TILE),
          floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x * TILE + TILE / 2, 0, z * TILE + TILE / 2);
        floor.receiveShadow = true;
        this.object3d.add(floor);
      }
    }
  }

  _buildCeiling() {
    const ceilMat = new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff,
      normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough,
      roughness: 0.95,
      color: 0xeee8e0,
    });
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const ceil = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE, TILE),
          ceilMat
        );
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(x * TILE + TILE / 2, ROOM_H, z * TILE + TILE / 2);
        this.object3d.add(ceil);
      }
    }
  }

  _createWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff,
      normalMap: this.textures.wallNor,
      roughnessMap: this.textures.wallRough,
      roughness: 0.85,
      color: 0xddcc88,
    });
  }

  _buildWalls() {
    const wallMat = this._createWallMaterial();

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;

        if (z === 0 || !this._isWalkable(x, z - 1)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(TILE, ROOM_H, WALL_T),
            wallMat
          );
          wall.position.set(x * TILE + TILE / 2, ROOM_H / 2, z * TILE);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (z === GH - 1 || !this._isWalkable(x, z + 1)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(TILE, ROOM_H, WALL_T),
            wallMat
          );
          wall.position.set(x * TILE + TILE / 2, ROOM_H / 2, z * TILE + TILE);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (x === 0 || !this._isWalkable(x - 1, z)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_T, ROOM_H, TILE),
            wallMat
          );
          wall.position.set(x * TILE, ROOM_H / 2, z * TILE + TILE / 2);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (x === GW - 1 || !this._isWalkable(x + 1, z)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_T, ROOM_H, TILE),
            wallMat
          );
          wall.position.set(x * TILE + TILE, ROOM_H / 2, z * TILE + TILE / 2);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }
      }
    }
  }

  _buildTrim() {
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.9 });

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;

        if (z === 0 || !this._isWalkable(x, z - 1)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.1, 0.02), trimMat);
          t.position.set(x * TILE + TILE / 2, 0.05, z * TILE);
          this.object3d.add(t);
        }
        if (z === GH - 1 || !this._isWalkable(x, z + 1)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.1, 0.02), trimMat);
          t.position.set(x * TILE + TILE / 2, 0.05, z * TILE + TILE);
          this.object3d.add(t);
        }
        if (x === 0 || !this._isWalkable(x - 1, z)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, TILE), trimMat);
          t.position.set(x * TILE, 0.05, z * TILE + TILE / 2);
          this.object3d.add(t);
        }
        if (x === GW - 1 || !this._isWalkable(x + 1, z)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, TILE), trimMat);
          t.position.set(x * TILE + TILE, 0.05, z * TILE + TILE / 2);
          this.object3d.add(t);
        }
      }
    }
  }

  _createLights() {
    const ambient = new THREE.AmbientLight(0xffddbb, 1.2);
    this.object3d.add(ambient);

    const lightPositions = [
      [10, 5], [20, 5], [30, 5], [40, 5], [50, 5],
      [10, 15], [20, 15], [30, 15], [40, 15], [50, 15],
      [10, 25], [20, 25], [30, 25],
    ];

    const buzz = [0.4, 0.7, 0.5, 0.9, 0.3, 0.8, 0.6, 0.75, 0.45, 0.85, 0.55, 0.65, 0.95];
    let bi = 0;

    const lightDiffTex = this.textures.lightDiff;
    const lightEmitTex = this.textures.lightEmit;
    const lightNorTex = this.textures.lightNor;
    const lightRoughTex = this.textures.lightRough;

    for (const [lx, lz] of lightPositions) {
      if (!this._isWalkable(Math.floor(lx / TILE), Math.floor(lz / TILE))) continue;
      const [gx, gz] = [Math.floor(lx / TILE), Math.floor(lz / TILE)];
      const cx = gx * TILE + TILE / 2;
      const cz = gz * TILE + TILE / 2;

      const fixtureMat = new THREE.MeshStandardMaterial({
        map: lightDiffTex,
        emissiveMap: lightEmitTex,
        normalMap: lightNorTex,
        roughnessMap: lightRoughTex,
        emissive: 0xffffff,
        emissiveIntensity: 1.0,
        roughness: 0.4,
        metalness: 0.3,
      });

      const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.25), fixtureMat);
      fixture.position.set(cx, ROOM_H - 0.025, cz);
      this.object3d.add(fixture);

      const glowMat = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffffaa,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.15,
      });
      const glow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.18), glowMat);
      glow.position.set(cx, ROOM_H - 0.04, cz);
      this.object3d.add(glow);

      const pl = new THREE.PointLight(0xffddaa, 0.3, 10);
      pl.position.set(cx, ROOM_H - 0.1, cz);
      pl.userData = { timer: Math.random() * 10, buzzRange: buzz[bi++ % buzz.length] };
      this.object3d.add(pl);
      this.lights.push(pl);
    }
  }

  _addWallDetails() {
    const stainMat = new THREE.MeshStandardMaterial({
      color: 0x887744,
      transparent: true,
      opacity: 0.06,
    });

    for (let i = 0; i < 60; i++) {
      let gx, gz;
      do {
        gx = Math.floor(Math.random() * GW);
        gz = Math.floor(Math.random() * GH);
      } while (!this._isWalkable(gx, gz));

      const wx = gx * TILE + Math.random() * TILE;
      const wz = gz * TILE + Math.random() * TILE;
      const stained = new THREE.Mesh(
        new THREE.CircleGeometry(0.3 + Math.random() * 0.6, 8),
        stainMat
      );

      const side = Math.floor(Math.random() * 4);
      if (side === 0) { stained.position.set(wx, 0.5 + Math.random() * 2, gz * TILE); stained.rotation.y = 0; }
      else if (side === 1) { stained.position.set(wx, 0.5 + Math.random() * 2, gz * TILE + TILE); stained.rotation.y = Math.PI; }
      else if (side === 2) { stained.position.set(gx * TILE, 0.5 + Math.random() * 2, wz); stained.rotation.y = -Math.PI / 2; }
      else { stained.position.set(gx * TILE + TILE, 0.5 + Math.random() * 2, wz); stained.rotation.y = Math.PI / 2; }

      this.object3d.add(stained);
    }
  }

  _cloneModel(key) {
    const src = this.models[key];
    if (!src || src.children.length === 0) return new THREE.Group();
    return src.clone(true);
  }

  _createProps() {
    const cells = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (this.grid[z][x] === 'r') cells.push({ x, z });
      }
    }

    for (let i = 0; i < Math.min(4, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cab = this._cloneModel('filing_cabinet');
      cab.position.set(cx, 0, cz);
      cab.scale.set(0.8, 0.8, 0.8);
      this.object3d.add(cab);
    }

    for (let i = 0; i < Math.min(4, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const shelf = this._cloneModel('shelf');
      shelf.position.set(cx, 0, cz);
      shelf.scale.set(1.5, 1.5, 1.5);
      this.object3d.add(shelf);
    }

    for (let i = 0; i < Math.min(2, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cooler = this._cloneModel('water_cooler');
      cooler.position.set(cx, 0, cz);
      cooler.scale.set(3, 3, 3);
      this.object3d.add(cooler);
    }
  }

  _spawnItem(type, x, z) {
    const modelKey = ITEM_MODEL_MAP[type];
    if (!modelKey) return;
    const mesh = this._cloneModel(modelKey.replace('.glb', ''));
    mesh.position.set(x, 0.05, z);
    this.object3d.add(mesh);
    this.interactables.push({
      mesh,
      type,
      position: new THREE.Vector3(x, 0.1, z),
    });
  }

  _createItems() {
    for (const [type, gx, gz] of ITEM_PLACEMENTS) {
      this._spawnItem(type, gx * TILE + TILE / 2, gz * TILE + TILE / 2);
    }
  }

  _placeEntities() {
    for (const [type, gx, gz, config] of ENTITY_PLACEMENTS) {
      this.entities.push({
        type,
        position: new THREE.Vector3(gx * TILE + TILE / 2, 0, gz * TILE + TILE / 2),
        speed: config.speed || 0,
        aggroRange: config.aggroRange || 0,
        patrolRadius: config.patrolRadius || 0,
        damage: config.damage || 0,
      });
    }
  }

  _createExit() {
    const px = 54 * TILE + TILE / 2;
    const pz = 13 * TILE + TILE / 2;

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.3 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.5 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, emissive: 0xcc2222, emissiveIntensity: 0.6 });
    const signGlowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.12), frameMat);
    frame.position.set(px, 1.3, pz);
    this.object3d.add(frame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.08), doorMat);
    door.position.set(px, 1.15, pz + 0.02);
    this.object3d.add(door);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.03), barMat);
    pushBar.position.set(px, 1.0, pz + 0.07);
    this.object3d.add(pushBar);

    const barL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), barMat);
    barL.position.set(px - 0.5, 1.0, pz + 0.07);
    barL.rotation.x = Math.PI / 2;
    this.object3d.add(barL);

    const barR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), barMat);
    barR.position.set(px + 0.5, 1.0, pz + 0.07);
    barR.rotation.x = Math.PI / 2;
    this.object3d.add(barR);

    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.3 });
    for (const hz of [0.3, -0.3]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), hingeMat);
      hinge.position.set(px - 0.56, hz + 1.15, pz + 0.02);
      this.object3d.add(hinge);
    }

    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.03), signMat);
    signBox.position.set(px, 2.6, pz + 0.06);
    this.object3d.add(signBox);

    const glowBg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.002), signGlowMat);
    glowBg.position.set(px, 2.6, pz + 0.075);
    this.object3d.add(glowBg);

    this.interactables.push({
      mesh: door,
      type: 'exit',
      position: new THREE.Vector3(px, 1.2, pz),
    });
  }

  getThreatModel(type) {
    const filename = THREAT_MODEL_MAP[type] || 'dog.glb';
    const key = filename.replace('.glb', '');
    return this.models[key] ? this.models[key].clone(true) : null;
  }

  getWallColliders() { return this.wallBoxes; }

  update(delta) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 0.3 * Math.max(0.85, 1 - Math.abs(f * 0.15));
    }
  }

  getInteractables() { return this.interactables; }

  getThreatPositions() { return this.entities; }
}
