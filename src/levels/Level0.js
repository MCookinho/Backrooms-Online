import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;

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

const LIGHT_TILES = [
  [5, 5], [10, 5], [15, 5], [20, 5], [25, 5], [30, 5], [35, 5], [40, 5], [45, 5], [50, 5], [55, 5],
  [5, 15], [10, 15], [15, 15], [20, 15], [25, 15], [30, 15], [35, 15], [40, 15], [45, 15], [50, 15], [55, 15],
  [5, 25], [10, 25], [15, 25], [20, 25], [25, 25], [30, 25],
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

const PIECE_NAMES = ['Floor', 'Wall Pain', 'Out Corner', 'In Corner', 'Ceiling Off', 'Ceiling On'];

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3((23 + 0.5) * TILE, 0, (12 + 0.5) * TILE);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.wallBoxes = [];
    this.grid = null;
    this.pieces = {};
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

  _bakeNode(node) {
    node.updateMatrix();
    node.traverse((child) => {
      if (child.isMesh) {
        child.geometry = child.geometry.clone();
        child.geometry.applyMatrix4(child.matrix);
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.scale.set(1, 1, 1);
      }
    });
  }

  async _loadAssets() {
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';

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

    const loader = new GLTFLoader();
    const assetPackPromise = new Promise((resolve) => {
      loader.load(
        `${base}/assets/models/backrooms_asset_pack.glb`,
        (gltf) => {
          for (const child of gltf.scene.children) {
            if (PIECE_NAMES.includes(child.name)) {
              const clone = child.clone();
              this._bakeNode(clone);
              this.pieces[child.name] = clone;
            }
          }
          resolve();
        },
        undefined,
        () => resolve()
      );
    });
    modelPromises.push(assetPackPromise);

    await Promise.all(modelPromises);
  }

  _clonePiece(name) {
    const src = this.pieces[name];
    if (!src) return null;
    return src.clone(true);
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
    this._createLights();
    this._createProps();
    this._createItems();
    this._createExit();
  }

  _isWalkable(x, z) {
    if (x < 0 || x >= GW || z < 0 || z >= GH) return false;
    return this.grid[z][x] !== ' ';
  }

  _buildFloor() {
    const template = this.pieces.Floor;
    if (!template) return;

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const p = template.clone(true);
        const s = TILE / 2;
        p.scale.set(s, 1, s);
        p.position.set(x * TILE + TILE / 2, 0, z * TILE + TILE / 2);
        p.traverse(c => { if (c.isMesh) c.receiveShadow = true; });
        this.object3d.add(p);
      }
    }
  }

  _buildCeiling() {
    const offTemplate = this.pieces['Ceiling Off'];
    const onTemplate = this.pieces['Ceiling On'];
    if (!offTemplate) return;

    const lightSet = new Set(LIGHT_TILES.map(([x, z]) => `${x},${z}`));

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const hasLight = lightSet.has(`${x},${z}`);
        const template = hasLight && onTemplate ? onTemplate : offTemplate;
        const p = template.clone(true);
        const s = TILE / 2;
        p.scale.set(s, 1, s);
        p.position.set(x * TILE + TILE / 2, ROOM_H, z * TILE + TILE / 2);
        this.object3d.add(p);
      }
    }
  }

  _buildWalls() {
    const wallTemplate = this.pieces['Wall Pain'];
    const outCornerTemplate = this.pieces['Out Corner'];
    const inCornerTemplate = this.pieces['In Corner'];
    if (!wallTemplate) return;

    const wallH = 2.95;
    const scaleY = ROOM_H / wallH;

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;

        const neighbors = {
          n: z > 0 && this._isWalkable(x, z - 1),
          s: z < GH - 1 && this._isWalkable(x, z + 1),
          w: x > 0 && this._isWalkable(x - 1, z),
          e: x < GW - 1 && this._isWalkable(x + 1, z),
        };

        const cx = x * TILE + TILE / 2;
        const cz = z * TILE + TILE / 2;
        const s = TILE / 2;

        if (!neighbors.n) {
          const leftCorner = !neighbors.w || (x > 0 && z > 0 && !this._isWalkable(x - 1, z - 1));
          const rightCorner = !neighbors.e || (x < GW - 1 && z > 0 && !this._isWalkable(x + 1, z - 1));

          if (leftCorner) {
            const p = this._createCorner(outCornerTemplate, inCornerTemplate, x, z, 'nw', s, scaleY);
            if (p) { p.position.set(cx - TILE / 2, 0, cz - TILE / 2); this.object3d.add(p); }
          }
          if (rightCorner) {
            const p = this._createCorner(outCornerTemplate, inCornerTemplate, x, z, 'ne', s, scaleY);
            if (p) { p.position.set(cx + TILE / 2, 0, cz - TILE / 2); this.object3d.add(p); }
          }

          const wall = wallTemplate.clone(true);
          wall.scale.set(s, scaleY, 1);
          wall.position.set(cx, 0, z * TILE);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (!neighbors.s) {
          const leftCorner = !neighbors.w || (x > 0 && z < GH - 1 && !this._isWalkable(x - 1, z + 1));
          const rightCorner = !neighbors.e || (x < GW - 1 && z < GH - 1 && !this._isWalkable(x + 1, z + 1));

          if (leftCorner) {
            const p = this._createCorner(outCornerTemplate, inCornerTemplate, x, z, 'se', s, scaleY);
            if (p) { p.position.set(cx + TILE / 2, 0, cz + TILE / 2); this.object3d.add(p); }
          }
          if (rightCorner) {
            const p = this._createCorner(outCornerTemplate, inCornerTemplate, x, z, 'sw', s, scaleY);
            if (p) { p.position.set(cx - TILE / 2, 0, cz + TILE / 2); this.object3d.add(p); }
          }

          const wall = wallTemplate.clone(true);
          wall.scale.set(s, scaleY, 1);
          wall.position.set(cx, 0, z * TILE + TILE);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (!neighbors.w) {
          const wall = wallTemplate.clone(true);
          wall.scale.set(s, scaleY, 1);
          wall.rotation.y = Math.PI / 2;
          wall.position.set(x * TILE, 0, cz);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (!neighbors.e) {
          const wall = wallTemplate.clone(true);
          wall.scale.set(s, scaleY, 1);
          wall.rotation.y = -Math.PI / 2;
          wall.position.set(x * TILE + TILE, 0, cz);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }
      }
    }
  }

  _createCorner(outTemplate, inTemplate, gx, gz, corner, s, scaleY) {
    const cornerMap = {
      nw: { out: 0, outPos: [0, 0], inRot: 0, inPos: [-1, -1] },
      ne: { out: Math.PI / 2, outPos: [0, 0], inRot: -Math.PI / 2, inPos: [1, -1] },
      se: { out: Math.PI, outPos: [0, 0], inRot: Math.PI, inPos: [1, 1] },
      sw: { out: -Math.PI / 2, outPos: [0, 0], inRot: Math.PI / 2, inPos: [-1, 1] },
    };
    const cfg = cornerMap[corner];
    if (!cfg) return null;

    const leftOpen = gx > 0 && gz > 0 && this._isWalkable(
      corner === 'nw' ? gx - 1 : corner === 'ne' ? gx + 1 : corner === 'se' ? gx + 1 : gx - 1,
      corner === 'nw' ? gz - 1 : corner === 'ne' ? gz - 1 : corner === 'se' ? gz + 1 : gz + 1
    );

    const template = leftOpen ? inTemplate : outTemplate;
    if (!template) return null;

    const p = template.clone(true);
    p.scale.set(s, scaleY, s);
    p.rotation.y = leftOpen ? (cfg.inRot || 0) : (cfg.out || 0);
    return p;
  }

  _createLights() {
    const ambient = new THREE.AmbientLight(0xffddbb, 1.2);
    this.object3d.add(ambient);

    const buzz = [0.4, 0.7, 0.5, 0.9, 0.3, 0.8, 0.6, 0.75, 0.45, 0.85, 0.55, 0.65, 0.95];
    let bi = 0;

    for (const [gx, gz] of LIGHT_TILES) {
      if (!this._isWalkable(gx, gz)) continue;
      const cx = gx * TILE + TILE / 2;
      const cz = gz * TILE + TILE / 2;

      const pl = new THREE.PointLight(0xffddaa, 0.3, 10);
      pl.position.set(cx, ROOM_H - 0.5, cz);
      pl.userData = { timer: Math.random() * 10, buzzRange: buzz[bi++ % buzz.length] };
      this.object3d.add(pl);
      this.lights.push(pl);
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

  getWallColliders() { return this.wallBoxes; }

  update(delta) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 0.3 * Math.max(0.85, 1 - Math.abs(f * 0.15));
    }
  }

  getInteractables() { return this.interactables; }
}
