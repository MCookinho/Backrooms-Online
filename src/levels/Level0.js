import * as THREE from 'three';

const TILE_SIZE = 4;
const ROOM_HEIGHT = 3.5;

const WALL_COLOR = 0xccbb77;
const FLOOR_COLOR = 0x887744;
const CEILING_COLOR = 0xccbb99;
const TRIM_COLOR = 0x998855;
const MOLD_COLOR = 0x445522;

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(2, 0, 2);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.rooms = [];
    this.wallBoxes = [];
    this.wallMat = null;
    this.floorMat = null;
    this.ceilMat = null;
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
    const basePath = window.location.pathname.replace(/\/[^/]*$/, '') || '.';

    const load = (name, relPath, repeatX = 2, repeatY = 1) => {
      const tex = this.textureLoader.load(`${basePath}/assets/textures/${relPath}`);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      this.textures[name] = tex;
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
    if (this.object3d.parent) {
      this.object3d.parent.remove(this.object3d);
    }
    this._disposeGroup(this.object3d);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
  }

  _disposeGroup(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  _buildLevel() {
    const layout = this._generateLayout();
    this.rooms = layout;

    for (let i = 0; i < layout.length; i++) {
      this._createRoom(layout[i], i);
    }

    this._createFluorescentLights(layout);
    this._createProps(layout);
    this._createExit();
  }

  _generateLayout() {
    const rooms = [];
    const grid = {};
    const roomTemplates = [
      { w: 1, h: 1, type: 'room' },
      { w: 2, h: 1, type: 'hall' },
      { w: 1, h: 2, type: 'hall' },
      { w: 2, h: 2, type: 'room' },
      { w: 1, h: 1, type: 'room' },
      { w: 3, h: 1, type: 'hall' },
      { w: 1, h: 3, type: 'hall' },
    ];

    const startX = 0, startZ = 0;
    const totalRooms = 12;
    let placed = 0;
    let attempts = 0;

    const placeRoom = (gx, gz, w, h, type) => {
      const key = `${gx},${gz}`;
      if (grid[key]) return false;

      for (let dx = 0; dx < w; dx++) {
        for (let dz = 0; dz < h; dz++) {
          const k = `${gx + dx},${gz + dz}`;
          if (grid[k]) return false;
        }
      }

      for (let dx = 0; dx < w; dx++) {
        for (let dz = 0; dz < h; dz++) {
          grid[`${gx + dx},${gz + dz}`] = true;
        }
      }

      rooms.push({
        x: gx, z: gz, w, h,
        type: type || 'room',
        connections: [],
      });
      return true;
    };

    placeRoom(startX, startZ, 1, 1, 'spawn');

    while (placed < totalRooms && attempts < 200) {
      attempts++;
      const template = roomTemplates[Math.floor(Math.random() * roomTemplates.length)];
      const dir = Math.floor(Math.random() * 4);
      const connectedRoom = rooms[Math.floor(Math.random() * rooms.length)];

      let nx = connectedRoom.x;
      let nz = connectedRoom.z;
      if (dir === 0) nz += connectedRoom.h;
      else if (dir === 1) nz -= template.h;
      else if (dir === 2) nx += connectedRoom.w;
      else if (dir === 3) nx -= template.w;

      if (placeRoom(nx, nz, template.w, template.h, template.type)) {
        connectedRoom.connections.push(rooms.length - 1);
        rooms[rooms.length - 1].connections.push(rooms.indexOf(connectedRoom));
        placed++;
      }
    }

    return rooms;
  }

  _createRoom(room, roomIndex) {
    const x = room.x * TILE_SIZE;
    const z = room.z * TILE_SIZE;
    const w = room.w * TILE_SIZE;
    const h = room.h * TILE_SIZE;
    const y = 0;

    const wallMat = this._createWallMaterial();
    const floorMat = this._createFloorMaterial();
    const ceilMat = this._createCeilingMaterial();
    const trimMat = new THREE.MeshStandardMaterial({ color: TRIM_COLOR, roughness: 0.7 });

    const wallThickness = 0.15;

    const createWallSegment = (cx, cz, segW, segH, ry) => {
      if (segW <= 0) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(segW, segH, wallThickness), wallMat);
      mesh.position.set(cx, y + segH / 2, cz);
      mesh.rotation.y = ry;
      this.object3d.add(mesh);
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      this.wallBoxes.push(box);
      return mesh;
    };

    const doorH = 2.2;
    const doorW = 0.9;

    const sides = [
      { dir: 'front', cx: x + w / 2, cz: z, len: w, ry: 0 },
      { dir: 'back', cx: x + w / 2, cz: z + h, len: w, ry: 0 },
      { dir: 'left', cx: x, cz: z + h / 2, len: h, ry: Math.PI / 2 },
      { dir: 'right', cx: x + w, cz: z + h / 2, len: h, ry: Math.PI / 2 },
    ];

    const hasConnection = { front: false, back: false, left: false, right: false };
    for (const connIdx of room.connections) {
      const conn = this._findRoomByIndex(connIdx);
      if (!conn) continue;
      const dx = conn.x - room.x;
      const dz = conn.z - room.z;
      let side = '';
      if (dz > 0) side = 'back';
      else if (dz < 0) side = 'front';
      else if (dx > 0) side = 'right';
      else if (dx < 0) side = 'left';

      if (side && roomIndex < connIdx) {
        hasConnection[side] = true;
      }
    }

    for (const side of sides) {
      if (hasConnection[side.dir]) {
        const seg1Len = (side.len - doorW) / 2;
        const seg2Len = (side.len - doorW) / 2;
        const doorCenter = side.cx;
        const doorCenterZ = side.cz;

        if (side.ry === 0) {
          const s1cx = side.cx - seg1Len / 2 - doorW / 4;
          const s1cz = side.cz;
          createWallSegment(s1cx, s1cz, seg1Len + doorW / 2, ROOM_HEIGHT, side.ry);
          const s2cx = side.cx + seg1Len / 2 + doorW / 4 + doorW / 2;
          const s2cz = side.cz;
          createWallSegment(s2cx, s2cz, seg2Len + doorW / 2, ROOM_HEIGHT, side.ry);
        } else {
          const s1cx = side.cx;
          const s1cz = side.cz - seg1Len / 2 - doorW / 4;
          createWallSegment(s1cx, s1cz, ROOM_HEIGHT, seg1Len + doorW / 2, side.ry);
          const s2cx = side.cx;
          const s2cz = side.cz + seg1Len / 2 + doorW / 4 + doorW / 2;
          createWallSegment(s2cx, s2cz, ROOM_HEIGHT, seg2Len + doorW / 2, side.ry);
        }

        this._createDoorFrame(doorCenter, doorCenterZ, side.ry, doorH, doorW);
      } else {
        createWallSegment(side.cx, side.cz, side.len, ROOM_HEIGHT, side.ry);
      }
    }

    const createFloor = () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, h), floorMat);
      mesh.position.set(x, y, z);
      this.object3d.add(mesh);
      return mesh;
    };

    const createCeiling = () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, h), ceilMat);
      mesh.position.set(x, y + ROOM_HEIGHT, z);
      this.object3d.add(mesh);
      return mesh;
    };

    createFloor();
    createCeiling();

    this._createWallpaperDetails(x, z, w, h);
    this._addMoldDetails(x, z, w, h);
  }

  _createDoorFrame(x, z, ry, doorH, doorW) {
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.8 });
    const thick = 0.08;

    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, thick, 0.12), doorFrameMat);
    frameBottom.position.set(x, 0.05, z);
    frameBottom.rotation.y = ry;
    this.object3d.add(frameBottom);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, thick, 0.12), doorFrameMat);
    frameTop.position.set(x, doorH + 0.04, z);
    frameTop.rotation.y = ry;
    this.object3d.add(frameTop);

    const offset = doorW / 2 + 0.07;
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);

    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(thick, doorH, 0.12), doorFrameMat);
    frameLeft.position.set(x - cos * offset, doorH / 2, z - sin * offset);
    this.object3d.add(frameLeft);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(thick, doorH, 0.12), doorFrameMat);
    frameRight.position.set(x + cos * offset, doorH / 2, z + sin * offset);
    this.object3d.add(frameRight);
  }



  _createWallpaperDetails(x, z, w, h) {
    const detailGroup = new THREE.Group();

    const linesMat = new THREE.MeshBasicMaterial({
      color: 0xbbaa66,
      transparent: true,
      opacity: 0.15,
    });

    const lineCount = Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < lineCount; i++) {
      const lx = x + Math.random() * w;
      const lz = z + Math.random() * h;
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.02, 0.5 + Math.random() * 0.5),
        linesMat
      );
      line.position.set(lx, 1.5 + Math.random() * 1.5, lz);
      line.rotation.x = Math.random() * Math.PI;
      this.object3d.add(line);
    }

    const stainMat = new THREE.MeshBasicMaterial({
      color: 0x665533,
      transparent: true,
      opacity: 0.1 + Math.random() * 0.15,
    });

    for (let i = 0; i < 3; i++) {
      const sx = x + Math.random() * w;
      const sz = z + Math.random() * h;
      const stain = new THREE.Mesh(
        new THREE.CircleGeometry(0.1 + Math.random() * 0.3, 8),
        stainMat
      );
      stain.position.set(sx, 0.5 + Math.random() * 2.5, sz);
      stain.rotation.x = -Math.PI / 2;
      this.object3d.add(stain);
    }
  }

  _addMoldDetails(x, z, w, h) {
    const moldMat = new THREE.MeshBasicMaterial({
      color: MOLD_COLOR,
      transparent: true,
      opacity: 0.3,
    });

    for (let i = 0; i < 4; i++) {
      const mx = x + Math.random() * w;
      const mz = z + Math.random() * h;
      const mold = new THREE.Mesh(
        new THREE.CircleGeometry(0.05 + Math.random() * 0.2, 6),
        moldMat
      );
      mold.position.set(mx, 0.05, mz);
      mold.rotation.x = -Math.PI / 2;
      this.object3d.add(mold);
    }
  }

  _createFluorescentLights(layout) {
    const lightFixtureMat = new THREE.MeshStandardMaterial({
      map: this.textures.lightDiff,
      normalMap: this.textures.lightNor,
      roughnessMap: this.textures.lightRough,
      roughness: 0.6,
      metalness: 0.3,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
      map: this.textures.lightEmit,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5,
    });

    for (const room of layout) {
      const x = room.x * TILE_SIZE;
      const z = room.z * TILE_SIZE;
      const w = room.w * TILE_SIZE;
      const h = room.h * TILE_SIZE;

      const numLightsX = Math.max(1, Math.floor(w / TILE_SIZE));
      const numLightsZ = Math.max(1, Math.floor(h / TILE_SIZE));

      for (let lx = 0; lx < numLightsX; lx++) {
        for (let lz = 0; lz < numLightsZ; lz++) {
          const px = x + (lx + 0.5) * (w / numLightsX);
          const pz = z + (lz + 0.5) * (h / numLightsZ);

          const fixture = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.05, 0.2),
            lightFixtureMat
          );
          fixture.position.set(px, ROOM_HEIGHT - 0.05, pz);
          this.object3d.add(fixture);

          const bulb = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.03, 0.1),
            bulbMat
          );
          bulb.position.set(px, ROOM_HEIGHT - 0.08, pz);
          this.object3d.add(bulb);

          const pl = new THREE.PointLight(0xfff0cc, 1.2, 10, 1.5);
          pl.position.set(px, ROOM_HEIGHT - 0.2, pz);
          this.object3d.add(pl);
          this.lights.push(pl);

          const buzzRange = 0.95 + Math.random() * 0.1;
          const flickerDelay = Math.random() * 10;
          pl.userData = { buzzRange, flickerDelay, timer: 0 };
        }
      }
    }

    const ambient = new THREE.AmbientLight(0xffeedd, 0.5);
    this.object3d.add(ambient);
  }

  _createProps(layout) {
    const propPositions = [];

    for (const room of layout) {
      if (room.type === 'spawn') continue;

      const x = room.x * TILE_SIZE;
      const z = room.z * TILE_SIZE;
      const w = room.w * TILE_SIZE;
      const h = room.h * TILE_SIZE;

      const numProps = Math.floor(Math.random() * 3);
      for (let i = 0; i < numProps; i++) {
        const px = x + 0.5 + Math.random() * (w - 1);
        const pz = z + 0.5 + Math.random() * (h - 1);
        propPositions.push({ x: px, z: pz, roomX: x, roomZ: z });
      }
    }

    for (const pos of propPositions) {
      if (Math.random() > 0.5) {
        const chair = this._createChair(pos.x, pos.z);
        this.object3d.add(chair);
      } else {
        const desk = this._createDesk(pos.x, pos.z);
        this.object3d.add(desk);
      }
    }

    this._createScatteredItems();
  }

  _createChair(x, z) {
    const group = new THREE.Group();
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.5 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), chairMat);
    seat.position.set(0, 0.5, 0);
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.05), chairMat);
    back.position.set(0, 0.75, -0.25);
    group.add(back);

    for (let lx of [-0.2, 0.2]) {
      for (let lz of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), metalMat);
        leg.position.set(lx, 0.225, lz);
        group.add(leg);
      }
    }

    group.position.set(x, 0, z);
    return group;
  }

  _createDesk(x, z) {
    const group = new THREE.Group();
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), deskMat);
    top.position.set(0, 0.75, 0);
    group.add(top);

    for (let lx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), deskMat);
      leg.position.set(lx, 0.36, 0);
      group.add(leg);
    }

    group.position.set(x, 0, z);
    return group;
  }

  _createScatteredItems() {
    const itemPositions = [
      { x: 4.5, z: 3.5, type: 'almond_water' },
      { x: 8.2, z: 7.1, type: 'flashlight' },
      { x: 12.5, z: 4.2, type: 'batteries' },
      { x: 6.8, z: 12.3, type: 'lighter' },
      { x: 15.2, z: 8.7, type: 'almond_water' },
      { x: 3.2, z: 15.8, type: 'note' },
    ];

    for (const ip of itemPositions) {
      const item = this._createItemMesh(ip.type);
      if (item) {
        item.position.set(ip.x, 0.05, ip.z);
        this.object3d.add(item);
        this.interactables.push({
          mesh: item,
          type: ip.type,
          position: new THREE.Vector3(ip.x, 0.1, ip.z),
        });
      }
    }
  }

  _createItemMesh(type) {
    const group = new THREE.Group();

    switch (type) {
      case 'almond_water': {
        const bottleMat = new THREE.MeshStandardMaterial({
          color: 0x88bbcc,
          transparent: true,
          opacity: 0.7,
          roughness: 0.2,
        });
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8), bottleMat);
        bottle.position.y = 0.15;
        group.add(bottle);

        const capMat = new THREE.MeshStandardMaterial({ color: 0x334455 });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), capMat);
        cap.position.y = 0.3;
        group.add(cap);

        const labelMat = new THREE.MeshStandardMaterial({ color: 0xaaddff });
        const label = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 8), labelMat);
        label.position.y = 0.15;
        label.scale.set(1, 1, 1.01);
        group.add(label);
        break;
      }
      case 'flashlight': {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8), bodyMat);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        const headMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 });
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.04, 8), headMat);
        head.rotation.x = Math.PI / 2;
        head.position.x = 0.14;
        group.add(head);

        const lensMat = new THREE.MeshStandardMaterial({
          color: 0xffffcc,
          emissive: 0xffffaa,
          emissiveIntensity: 0.1,
        });
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), lensMat);
        lens.position.x = 0.16;
        group.add(lens);
        break;
      }
      case 'batteries': {
        const battMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
        const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), battMat);
        batt.rotation.x = Math.PI / 2;
        group.add(batt);
        const batt2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), battMat);
        batt2.rotation.x = Math.PI / 2;
        batt2.position.set(0, 0, 0.1);
        group.add(batt2);
        break;
      }
      case 'lighter': {
        const lightMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.03), lightMat);
        body.position.y = 0.06;
        group.add(body);
        break;
      }
      case 'note': {
        const noteMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb });
        const note = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), noteMat);
        note.position.y = 0.01;
        group.add(note);
        break;
      }
      default:
        return null;
    }

    return group;
  }

  _createExit() {
    const exitMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
    });
    const exitGlow = new THREE.MeshStandardMaterial({
      color: 0x445566,
      emissive: 0x223344,
      emissiveIntensity: 0.3,
    });

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), exitMat);
    door.position.set(18, 1.2, 18);
    this.object3d.add(door);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.05), exitGlow);
    glow.position.set(18, 2.5, 18.05);
    this.object3d.add(glow);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.05), exitGlow);
    sign.position.set(18, 2.5, 18.1);
    this.object3d.add(sign);

    this.interactables.push({
      mesh: door,
      type: 'exit',
      position: new THREE.Vector3(18, 1.2, 18),
    });
  }

  _findRoomByIndex(index) {
    return this.rooms[index];
  }

  _createWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff,
      normalMap: this.textures.wallNor,
      roughness: 0.85,
      color: 0xffffff,
    });
  }

  _createFloorMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.floorDiff,
      normalMap: this.textures.floorNor,
      roughness: 0.95,
    });
  }

  _createCeilingMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff,
      normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough,
      roughness: 0.9,
    });
  }

  getWallColliders() {
    return this.wallBoxes;
  }

  update(delta, player) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const flicker = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      const flickerAmount = Math.max(0.9, 1 - Math.abs(flicker * 0.1));
      light.intensity = 1.2 * flickerAmount;
    }
  }

  getInteractables() {
    return this.interactables;
  }
}
