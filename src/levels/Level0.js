import * as THREE from 'three';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;
const HALF_T = WALL_T / 2;
const DOOR_W = 0.9;
const DOOR_H = 2.2;

const SPAWN = 'spawn';
const HALL = 'hall';
const ROOM = 'room';

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(TILE / 2, 0, TILE / 2);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.rooms = [];
    this.wallBoxes = [];
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
    this.textureLoader = new THREE.TextureLoader();
    this._loadTextures();
    this._buildLevel();
  }

  _loadTextures() {
    this.textures = {};
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';
    const load = (name, path, rx = 2, ry = 1) => {
      const t = this.textureLoader.load(`${base}/assets/textures/${path}`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      this.textures[name] = t;
    };
    load('wallDiff', 'backrooms-wall-diffuse.png', 2, 1);
    load('wallNor', 'backrooms-wall-normal.png', 2, 1);
    load('floorDiff', 'backrooms-carpet-diffuse.png', 4, 4);
    load('floorNor', 'backrooms-carpet-normal.png', 4, 4);
    load('ceilDiff', 'backrooms-ceiling-tile-diffuse.png', 4, 4);
    load('ceilNor', 'backrooms-ceiling-tile-normal.png', 4, 4);
    load('ceilRough', 'backrooms-ceiling-tile-roughness.png', 4, 4);
    load('lightDiff', 'backrooms-ceiling-light-diffuse.png', 1, 1);
    load('lightEmit', 'backrooms-ceiling-light-emission.png', 1, 1);
    load('lightNor', 'backrooms-ceiling-light-normal.png', 1, 1);
    load('lightRough', 'backrooms-ceiling-light-roughness.png', 1, 1);
  }

  unload() {
    if (this.object3d.parent) this.object3d.parent.remove(this.object3d);
    this._disposeGroup(this.object3d);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
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

  // ----- LAYOUT GENERATION -----

  _buildLevel() {
    this.rooms = this._generateLayout();
    for (let i = 0; i < this.rooms.length; i++) this._createRoom(this.rooms[i], i);
    this._createFluorescentLights();
    this._createProps();
    this._createExit();
  }

  _generateLayout() {
    const grid = {};
    const rooms = [];

    const occ = (x, z) => grid[`${x},${z}`];
    const mark = (x, z, w, h) => {
      for (let dx = 0; dx < w; dx++)
        for (let dz = 0; dz < h; dz++)
          grid[`${x + dx},${z + dz}`] = true;
    };
    const free = (x, z, w, h, margin = 0) => {
      for (let dx = -margin; dx < w + margin; dx++)
        for (let dz = -margin; dz < h + margin; dz++)
          if (occ(x + dx, z + dz)) return false;
      return true;
    };

    const add = (x, z, w, h, type) => {
      mark(x, z, w, h);
      const idx = rooms.length;
      rooms.push({ x, z, w, h, type, connections: [] });
      return idx;
    };

    const TEMPLATES = [
      { w: 1, h: 2, type: HALL },
      { w: 2, h: 1, type: HALL },
      { w: 1, h: 3, type: HALL },
      { w: 3, h: 1, type: HALL },
      { w: 1, h: 4, type: HALL },
      { w: 4, h: 1, type: HALL },
      { w: 2, h: 2, type: ROOM },
      { w: 2, h: 3, type: ROOM },
      { w: 3, h: 2, type: ROOM },
      { w: 3, h: 3, type: ROOM },
    ];

    const ROOM_TEMPLATES = TEMPLATES.filter(t => t.type === ROOM);
    const HALL_TEMPLATES = TEMPLATES.filter(t => t.type === HALL);

    // Spawn at center
    add(0, 0, 1, 1, SPAWN);

    const MAX_ROOMS = 24;
    const MAX_ATTEMPTS = 300;
    let attempts = 0;

    while (rooms.length < MAX_ROOMS && attempts < MAX_ATTEMPTS) {
      attempts++;
      const src = rooms[Math.floor(Math.random() * rooms.length)];
      const dir = Math.floor(Math.random() * 4);
      const isHall = Math.random() < 0.45;
      const tmpl = isHall
        ? HALL_TEMPLATES[Math.floor(Math.random() * HALL_TEMPLATES.length)]
        : ROOM_TEMPLATES[Math.floor(Math.random() * ROOM_TEMPLATES.length)];

      const maxOff = dir < 2 ? src.w - 1 : src.h - 1;
      const off = maxOff > 0 ? Math.floor(Math.random() * (maxOff + 1)) : 0;

      let nx, nz;
      if (dir === 0) { nx = src.x + off; nz = src.z + src.h; }
      else if (dir === 1) { nx = src.x + off; nz = src.z - tmpl.h; }
      else if (dir === 2) { nx = src.x + src.w; nz = src.z + off; }
      else { nx = src.x - tmpl.w; nz = src.z + off; }

      // For halls, add a margin of 1 on the short sides to avoid adjacent rooms
      const margin = tmpl.type === HALL ? (tmpl.w === 1 || tmpl.h === 1 ? 0 : 1) : 1;
      if (!free(nx, nz, tmpl.w, tmpl.h, margin)) continue;

      const ni = add(nx, nz, tmpl.w, tmpl.h, tmpl.type);
      src.connections.push(ni);
      rooms[ni].connections.push(rooms.indexOf(src));
    }

    return rooms;
  }

  // ----- ROOM CONSTRUCTION -----

  _createRoom(room, idx) {
    const x = room.x * TILE;
    const z = room.z * TILE;
    const w = room.w * TILE;
    const h = room.h * TILE;

    const wallMat = this._createWallMaterial();
    const floorMat = this._createFloorMaterial();
    const ceilMat = this._createCeilingMaterial();
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.7 });

    const wallY = ROOM_H / 2;

    const addWall = (cx, cz, sw, ry) => {
      if (sw <= 0.01) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, ROOM_H, WALL_T), wallMat);
      m.position.set(cx, wallY, cz);
      m.rotation.y = ry;
      this.object3d.add(m);
      m.updateMatrixWorld(true);
      this.wallBoxes.push(new THREE.Box3().setFromObject(m));
    };

    // Determine which sides have doors (lower idx) or skip (higher idx)
    const hasDoor = { front: false, back: false, left: false, right: false };
    const isConn = { front: false, back: false, left: false, right: false };

    for (const ci of room.connections) {
      const c = this.rooms[ci];
      if (!c) continue;
      const dx = c.x - room.x;
      const dz = c.z - room.z;
      let side = '';
      if (dz > 0) side = 'back';
      else if (dz < 0) side = 'front';
      else if (dx > 0) side = 'right';
      else side = 'left';
      if (!side) continue;
      isConn[side] = true;
      if (idx < ci) hasDoor[side] = true;
    }

    const sides = [
      { dir: 'front', cx: x + w / 2, cz: z + HALF_T, ry: 0 },
      { dir: 'back', cx: x + w / 2, cz: z + h - HALF_T, ry: 0 },
      { dir: 'left', cx: x + HALF_T, cz: z + h / 2, ry: Math.PI / 2 },
      { dir: 'right', cx: x + w - HALF_T, cz: z + h / 2, ry: Math.PI / 2 },
    ];

    for (const side of sides) {
      const len = (side.dir === 'front' || side.dir === 'back') ? w : h;

      if (isConn[side.dir] && !hasDoor[side.dir]) {
        // Higher-index room on a shared side: skip wall entirely
        continue;
      }

      if (hasDoor[side.dir]) {
        const seg = (len - DOOR_W) / 2;
        if (seg <= 0) continue;

        if (side.ry === 0) {
          addWall(side.cx - len / 2 + seg / 2, side.cz, seg, 0);
          addWall(side.cx + len / 2 - seg / 2, side.cz, seg, 0);
        } else {
          addWall(side.cx, side.cz - len / 2 + seg / 2, seg, Math.PI / 2);
          addWall(side.cx, side.cz + len / 2 - seg / 2, seg, Math.PI / 2);
        }
        this._createDoorFrame(side.cx, side.cz, side.ry);
      } else {
        addWall(side.cx, side.cz, len, side.ry);
      }
    }

    // Floor (surface at y = 0)
    const fl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, h), floorMat);
    fl.position.set(x + w / 2, -0.1, z + h / 2);
    this.object3d.add(fl);

    // Ceiling
    const cl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, h), ceilMat);
    cl.position.set(x + w / 2, ROOM_H, z + h / 2);
    this.object3d.add(cl);

    // Wall trim (baseboard) along non-door walls
    this._createTrim(x, z, w, h, room, idx, trimMat);
  }

  _createTrim(rx, rz, rw, rh, room, idx, mat) {
    const hasDoor = { front: false, back: false, left: false, right: false };
    const isConn = { front: false, back: false, left: false, right: false };

    for (const ci of room.connections) {
      const c = this.rooms[ci];
      if (!c) continue;
      const dx = c.x - room.x;
      const dz = c.z - room.z;
      let side = '';
      if (dz > 0) side = 'back';
      else if (dz < 0) side = 'front';
      else if (dx > 0) side = 'right';
      else side = 'left';
      if (!side) continue;
      isConn[side] = true;
      if (idx < ci) hasDoor[side] = true;
    }

    const th = 0.08;
    const td = 0.06;
    const ty = th / 2;

    const makeTrim = (cx, cz, len, ry) => {
      if (len <= 0) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, th, td), mat);
      m.position.set(cx, ty, cz);
      m.rotation.y = ry;
      this.object3d.add(m);
    };

    const sides = [
      { dir: 'front', cx: rx + rw / 2, cz: rz + 0.01, ry: 0 },
      { dir: 'back', cx: rx + rw / 2, cz: rz + rh - 0.01, ry: 0 },
      { dir: 'left', cx: rx + 0.01, cz: rz + rh / 2, ry: Math.PI / 2 },
      { dir: 'right', cx: rx + rw - 0.01, cz: rz + rh / 2, ry: Math.PI / 2 },
    ];

    for (const s of sides) {
      if (isConn[s.dir] && !hasDoor[s.dir]) continue;
      const len = (s.dir === 'front' || s.dir === 'back') ? rw : rh;
      if (hasDoor[s.dir]) {
        const seg = (len - DOOR_W) / 2;
        if (seg <= 0) continue;
        if (s.ry === 0) {
          makeTrim(s.cx - len / 2 + seg / 2, s.cz, seg, 0);
          makeTrim(s.cx + len / 2 - seg / 2, s.cz, seg, 0);
        } else {
          makeTrim(s.cx, s.cz - len / 2 + seg / 2, seg, Math.PI / 2);
          makeTrim(s.cx, s.cz + len / 2 - seg / 2, seg, Math.PI / 2);
        }
      } else {
        makeTrim(s.cx, s.cz, len, s.ry);
      }
    }
  }

  _createDoorFrame(x, z, ry) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.8 });
    const thick = 0.08;
    const inset = 0.02;

    const top = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.2, thick, 0.1), mat);
    top.position.set(x, DOOR_H + inset, z);
    top.rotation.y = ry;
    this.object3d.add(top);

    const off = DOOR_W / 2 + 0.06;
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);

    const left = new THREE.Mesh(new THREE.BoxGeometry(thick, DOOR_H, 0.1), mat);
    left.position.set(x - cos * off, DOOR_H / 2 + inset, z - sin * off);
    this.object3d.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(thick, DOOR_H, 0.1), mat);
    right.position.set(x + cos * off, DOOR_H / 2 + inset, z + sin * off);
    this.object3d.add(right);
  }

  // ----- LIGHTING -----

  _createFluorescentLights() {
    const fixMat = new THREE.MeshStandardMaterial({
      map: this.textures.lightDiff, normalMap: this.textures.lightNor,
      roughnessMap: this.textures.lightRough, roughness: 0.6, metalness: 0.3, color: 0xcccccc,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
      map: this.textures.lightEmit, emissive: 0xffffaa,
      emissiveIntensity: 0.5, color: 0xffffaa,
    });

    for (const room of this.rooms) {
      const x = room.x * TILE, z = room.z * TILE;
      const w = room.w * TILE, h = room.h * TILE;
      const nx = Math.max(1, Math.floor(w / TILE));
      const nz = Math.max(1, Math.floor(h / TILE));

      for (let lx = 0; lx < nx; lx++) {
        for (let lz = 0; lz < nz; lz++) {
          const px = x + (lx + 0.5) * (w / nx);
          const pz = z + (lz + 0.5) * (h / nz);

          const fix = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.2), fixMat);
          fix.position.set(px, ROOM_H - 0.05, pz);
          this.object3d.add(fix);

          const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.1), bulbMat);
          bulb.position.set(px, ROOM_H - 0.08, pz);
          this.object3d.add(bulb);

          const pl = new THREE.PointLight(0xfff0cc, 1.2, 10, 1.5);
          pl.position.set(px, ROOM_H - 0.2, pz);
          this.object3d.add(pl);
          this.lights.push(pl);
          pl.userData = { buzzRange: 0.95 + Math.random() * 0.1, timer: 0 };
        }
      }
    }

    const ambient = new THREE.AmbientLight(0xffeedd, 0.4);
    this.object3d.add(ambient);
  }

  // ----- PROPS -----

  _createProps() {
    const placed = [];

    for (const room of this.rooms) {
      if (room.type === SPAWN) continue;
      const x = room.x * TILE, z = room.z * TILE;
      const w = room.w * TILE, h = room.h * TILE;
      const area = w * h;

      // More props in larger rooms
      const count = room.type === ROOM
        ? Math.floor(Math.random() * Math.min(4, area / 10)) + 1
        : Math.floor(Math.random() * 2);

      for (let i = 0; i < count; i++) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const px = x + 0.8 + Math.random() * (w - 1.6);
          const pz = z + 0.8 + Math.random() * (h - 1.6);
          const tooClose = placed.some(p =>
            Math.abs(p.x - px) < 1.2 && Math.abs(p.z - pz) < 1.2
          );
          if (!tooClose) {
            placed.push({ x: px, z: pz });
            const isChair = Math.random() < 0.6;
            this.object3d.add(isChair ? this._createChair(px, pz) : this._createDesk(px, pz));
            break;
          }
        }
      }
    }

    this._createScatteredItems();
  }

  _createChair(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.5 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat);
    seat.position.set(0, 0.5, 0);
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.05), mat);
    back.position.set(0, 0.75, -0.25);
    g.add(back);

    for (const lx of [-0.2, 0.2]) {
      for (const lz of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), metal);
        leg.position.set(lx, 0.225, lz);
        g.add(leg);
      }
    }

    g.position.set(x, 0, z);
    return g;
  }

  _createDesk(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), mat);
    top.position.set(0, 0.75, 0);
    g.add(top);

    for (const lx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), mat);
      leg.position.set(lx, 0.36, 0);
      g.add(leg);
    }

    g.position.set(x, 0, z);
    return g;
  }

  _createScatteredItems() {
    const positions = [
      { x: TILE + 0.5, z: TILE + 0.5, type: 'almond_water' },
      { x: TILE * 3 + 0.5, z: TILE * 2 + 0.5, type: 'flashlight' },
      { x: TILE * 5 + 0.5, z: TILE + 0.5, type: 'batteries' },
      { x: TILE * 2 + 0.5, z: TILE * 4 + 0.5, type: 'lighter' },
      { x: TILE * 4 + 0.5, z: TILE * 3 + 0.5, type: 'almond_water' },
      { x: TILE + 0.5, z: TILE * 6 + 0.5, type: 'note' },
    ];

    const spawnRoom = this.rooms.find(r => r.type === SPAWN);
    const sx = spawnRoom ? spawnRoom.x * TILE : 0;
    const sz = spawnRoom ? spawnRoom.z * TILE : 0;

    // Place items in rooms near spawn
    let idx = 0;
    for (const room of this.rooms) {
      if (room.type === SPAWN) continue;
      if (idx >= positions.length) break;
      const px = room.x * TILE + room.w * TILE / 2;
      const pz = room.z * TILE + room.h * TILE / 2;
      const p = positions[idx];
      this._spawnItem(p.type, px, pz);
      idx++;
    }
  }

  _spawnItem(type, x, z) {
    const item = this._createItemMesh(type);
    if (!item) return;
    item.position.set(x, 0.05, z);
    this.object3d.add(item);
    this.interactables.push({
      mesh: item,
      type,
      position: new THREE.Vector3(x, 0.1, z),
    });
  }

  _createItemMesh(type) {
    const g = new THREE.Group();
    switch (type) {
      case 'almond_water': {
        const bMat = new THREE.MeshStandardMaterial({ color: 0x88bbcc, transparent: true, opacity: 0.7, roughness: 0.2 });
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8), bMat);
        b.position.y = 0.15; g.add(b);
        const cMat = new THREE.MeshStandardMaterial({ color: 0x334455 });
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), cMat);
        c.position.y = 0.3; g.add(c);
        const lMat = new THREE.MeshStandardMaterial({ color: 0xaaddff });
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 8), lMat);
        l.position.y = 0.15; l.scale.set(1, 1, 1.01); g.add(l);
        break;
      }
      case 'flashlight': {
        const bMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8), bMat);
        b.rotation.x = Math.PI / 2; g.add(b);
        const hMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 });
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.04, 8), hMat);
        h.rotation.x = Math.PI / 2; h.position.x = 0.14; g.add(h);
        const lMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.1 });
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), lMat);
        l.position.x = 0.16; g.add(l);
        break;
      }
      case 'batteries': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), mat);
        b1.rotation.x = Math.PI / 2; g.add(b1);
        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), mat);
        b2.rotation.x = Math.PI / 2; b2.position.set(0, 0, 0.1); g.add(b2);
        break;
      }
      case 'lighter': {
        const mat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.03), mat);
        b.position.y = 0.06; g.add(b);
        break;
      }
      case 'note': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xeeddbb });
        const n = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), mat);
        n.position.y = 0.01; g.add(n);
        break;
      }
      default: return null;
    }
    return g;
  }

  // ----- EXIT -----

  _createExit() {
    // Place exit in the room farthest from spawn using BFS
    const dist = {};
    const queue = [0];
    dist[0] = 0;
    let farIdx = 0;

    while (queue.length) {
      const cur = queue.shift();
      for (const conn of this.rooms[cur].connections) {
        if (dist[conn] === undefined) {
          dist[conn] = dist[cur] + 1;
          queue.push(conn);
          if (dist[conn] > dist[farIdx]) farIdx = conn;
        }
      }
    }

    const exitRoom = this.rooms[farIdx];
    const ex = exitRoom.x * TILE + exitRoom.w * TILE / 2;
    const ez = exitRoom.z * TILE + exitRoom.h * TILE / 3;
    const ed = exitRoom.z * TILE + exitRoom.h * TILE / 2;

    const exitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0x223344, emissiveIntensity: 0.3 });

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), exitMat);
    door.position.set(ex, 1.2, ez);
    this.object3d.add(door);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.05), glowMat);
    glow.position.set(ex, 2.5, ez + 0.05);
    this.object3d.add(glow);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.05), glowMat);
    sign.position.set(ex, 2.5, ez + 0.1);
    this.object3d.add(sign);

    this.interactables.push({
      mesh: door,
      type: 'exit',
      position: new THREE.Vector3(ex, 1.2, ed),
    });
  }

  // ----- MATERIALS -----

  _createWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85, color: 0xccbb77,
    });
  }

  _createFloorMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.floorDiff, normalMap: this.textures.floorNor,
      roughness: 0.95, color: 0x887744,
    });
  }

  _createCeilingMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff, normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough, roughness: 0.9, color: 0xccbb99,
    });
  }

  // ----- PUBLIC -----

  getWallColliders() { return this.wallBoxes; }

  update(delta) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 1.2 * Math.max(0.9, 1 - Math.abs(f * 0.1));
    }
  }

  getInteractables() { return this.interactables; }

  getThreatPositions() {
    const nonSpawn = this.rooms.filter(r => r.type !== SPAWN);
    const positions = [];
    const shuffled = [...nonSpawn].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      const r = shuffled[i];
      const x = r.x * TILE + 0.8 + Math.random() * (r.w * TILE - 1.6);
      const z = r.z * TILE + 0.8 + Math.random() * (r.h * TILE - 1.6);
      positions.push(new THREE.Vector3(x, 0, z));
    }
    return positions;
  }
}
