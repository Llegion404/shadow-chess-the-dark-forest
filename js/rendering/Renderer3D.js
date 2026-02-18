/**
 * Renderer3D - Three.js based 3D renderer for Shadow Chess
 * 
 * Dependencies (must be loaded before this class):
 * - Three.js (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
 * - OrbitControls (https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js)
 * 
 * Coordinate system: Three.js uses Y-up, so board Y maps to world Z.
 */

// Configuration constants
const CONFIG = {
  CAMERA: { INITIAL_Y: 35, INITIAL_Z: 25, FOV: 60 },
  CONTROLS: { MIN_DISTANCE: 15, MAX_DISTANCE: 60, MAX_POLAR_ANGLE_DIV: 2.2, DAMPING: 0.05 },
  LIGHTING: { FOG_DENSITY: 0.015, AMBIENT_INTENSITY: 0.3, MOON_INTENSITY: 0.5, POINT_RANGE: 50 },
  PARTICLES: { AMBIENT_COUNT: 500, SPARKLE_POOL: 50, EXPLOSION_POOL: 10, RISE_SPEED: 0.05, DECAY: 0.02 },
  FOG: { HEIGHT: 3, CENTER_Y: 1.5, SKY_LIMIT: 20 },
  BOARD: { CELL_SIZE: 2, WORLD_SPAN: 60 },
  EFFECTS: { SPARKLE_COUNT: 10, EXPLOSION_SIZE: 0.5 },
  GHOST: { OPACITY: 0.5 }
};

class Renderer3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cellSize = 2;
    this.boardGroup = null;
    this.piecesGroup = null;
    this.fogGroup = null;
    this.highlightMesh = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pieceMeshes = new Map();
    this.cellMeshes = [];
    this.fogMeshes = new Map();
    this.state = null;
    this.particles = [];
    this.ambientParticles = null;
    this.sharedGeometries = {};
    this.sharedMaterials = {};
    this.highlightedCells = new Set();
    this.sparklePool = [];
    this.explosionPool = [];
    this.isInitialized = false;
  }

  init(state) {
    this.state = state;
    this.createSharedAssets();
    this.setupScene();
    this.createBoard(state);
    this.createPieces(state);
    this.createFog(state);
    this.createAtmosphericEffects();
    this.createHighlight();
    this.createObjectPools();
    this.isInitialized = true;
  }

  createSharedAssets() {
    this.sharedGeometries.cell = new THREE.BoxGeometry(this.cellSize - 0.1, 0.3, this.cellSize - 0.1);
    this.sharedGeometries.trunk = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 6);
    this.sharedGeometries.leaves = new THREE.ConeGeometry(0.4, 0.8, 6);
    this.sharedGeometries.stone = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    this.sharedGeometries.altar = new THREE.CylinderGeometry(0.25, 0.3, 0.2, 8);
    this.sharedGeometries.glow = new THREE.SphereGeometry(0.35, 8, 8);
    this.sharedGeometries.fogTile = new THREE.BoxGeometry(this.cellSize - 0.05, 3, this.cellSize - 0.05);
    this.sharedGeometries.sparkle = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    this.sharedGeometries.explosion = new THREE.SphereGeometry(0.5, 8, 8);
    
    this.sharedGeometries.pawn = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 16);
    this.sharedGeometries.rook = new THREE.CylinderGeometry(0.2, 0.225, 0.6, 8);
    this.sharedGeometries.knight = new THREE.ConeGeometry(0.2, 0.65, 8);
    this.sharedGeometries.bishop = new THREE.ConeGeometry(0.175, 0.7, 16);
    this.sharedGeometries.queen = new THREE.SphereGeometry(0.25, 16, 16);
    this.sharedGeometries.king = new THREE.CylinderGeometry(0.175, 0.25, 0.75, 8);
    this.sharedGeometries.fallback = new THREE.BoxGeometry(0.25, 0.5, 0.25);

    this.sharedMaterials.cellColors = {
      PLAIN_LIGHT: new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.7, metalness: 0.1 }),
      PLAIN_DARK: new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.7, metalness: 0.1 }),
      FOREST_LIGHT: new THREE.MeshStandardMaterial({ color: 0x2a5a3a, roughness: 0.7, metalness: 0.1 }),
      FOREST_DARK: new THREE.MeshStandardMaterial({ color: 0x1a4a2a, roughness: 0.7, metalness: 0.1 }),
      RUINS: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.1 }),
      SACRED_LIGHT: new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.7, metalness: 0.1 }),
      SACRED_DARK: new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.7, metalness: 0.1 }),
      SWAMP_LIGHT: new THREE.MeshStandardMaterial({ color: 0x2a4a4a, roughness: 0.7, metalness: 0.1 }),
      SWAMP_DARK: new THREE.MeshStandardMaterial({ color: 0x1a3a3a, roughness: 0.7, metalness: 0.1 }),
    };

    this.sharedMaterials.whitePiece = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0, roughness: 0.3, metalness: 0.6, emissive: 0x111111
    });
    this.sharedMaterials.blackPiece = new THREE.MeshStandardMaterial({
      color: 0xdd4444, roughness: 0.3, metalness: 0.6, emissive: 0x220000
    });
    this.sharedMaterials.fogDark = new THREE.MeshBasicMaterial({
      color: 0x050508, transparent: true, opacity: 0.95
    });
    this.sharedMaterials.fogMemory = new THREE.MeshBasicMaterial({
      color: 0x0a0a10, transparent: true, opacity: 0.5
    });
  }

  createObjectPools() {
    for (let i = 0; i < CONFIG.PARTICLES.SPARKLE_POOL; i++) {
      const mesh = new THREE.Mesh(this.sharedGeometries.sparkle, null);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparklePool.push({ mesh, active: false, life: 0 });
    }
    
    for (let i = 0; i < CONFIG.PARTICLES.EXPLOSION_POOL; i++) {
      const mesh = new THREE.Mesh(this.sharedGeometries.explosion, null);
      mesh.visible = false;
      this.scene.add(mesh);
      this.explosionPool.push({ mesh, active: false, life: 0 });
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);
    this.scene.fog = new THREE.FogExp2(0x0a0a12, CONFIG.LIGHTING.FOG_DENSITY);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(CONFIG.CAMERA.FOV, aspect, 0.1, 1000);
    this.camera.position.set(0, CONFIG.CAMERA.INITIAL_Y, CONFIG.CAMERA.INITIAL_Z);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CONFIG.CONTROLS.DAMPING;
    this.controls.maxPolarAngle = Math.PI / CONFIG.CONTROLS.MAX_POLAR_ANGLE_DIV;
    this.controls.minDistance = CONFIG.CONTROLS.MIN_DISTANCE;
    this.controls.maxDistance = CONFIG.CONTROLS.MAX_DISTANCE;

    const ambientLight = new THREE.AmbientLight(0x404060, CONFIG.LIGHTING.AMBIENT_INTENSITY);
    this.scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x8888ff, CONFIG.LIGHTING.MOON_INTENSITY);
    moonLight.position.set(-20, 30, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 100;
    moonLight.shadow.camera.left = -30;
    moonLight.shadow.camera.right = 30;
    moonLight.shadow.camera.top = 30;
    moonLight.shadow.camera.bottom = -30;
    this.scene.add(moonLight);

    const pointLight1 = new THREE.PointLight(0x4466ff, 0.5, CONFIG.LIGHTING.POINT_RANGE);
    pointLight1.position.set(10, 15, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4466, 0.3, CONFIG.LIGHTING.POINT_RANGE);
    pointLight2.position.set(-10, 15, -10);
    this.scene.add(pointLight2);

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getCellSize() {
    return this.cellSize;
  }

  getOffsetX() {
    return -this.state.board.width * this.cellSize / 2;
  }

  getOffsetZ() {
    return -this.state.board.height * this.cellSize / 2;
  }

  getOffsetY() {
    return this.getOffsetZ();
  }

  getBoardOffsets() {
    const { width, height } = this.state.board;
    return {
      offsetX: -width * this.cellSize / 2,
      offsetZ: -height * this.cellSize / 2
    };
  }

  createBoard(state) {
    this.boardGroup = new THREE.Group();
    const { width, height, terrain } = state.board;

    const { offsetX, offsetZ } = this.getBoardOffsets();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = this.createCell(x, y, terrain[y][x], offsetX, offsetZ);
        cell.userData = { boardX: x, boardY: y, type: 'cell' };
        this.cellMeshes.push(cell);
        this.boardGroup.add(cell);
      }
    }

    const borderGeom = new THREE.BoxGeometry(width * this.cellSize + 1, 0.5, height * this.cellSize + 1);
    const borderMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2a, 
      roughness: 0.8,
      metalness: 0.2
    });
    const border = new THREE.Mesh(borderGeom, borderMat);
    border.position.y = -0.3;
    border.receiveShadow = true;
    this.boardGroup.add(border);

    this.scene.add(this.boardGroup);
  }

  createCell(x, y, terrainType, offsetX, offsetZ) {
    const isLight = (x + y) % 2 === 0;
    let material;
    let heightOffset = 0;

    switch(terrainType) {
      case 'FOREST':  // Trees block line of sight
        material = isLight ? this.sharedMaterials.cellColors.FOREST_LIGHT : this.sharedMaterials.cellColors.FOREST_DARK;
        heightOffset = 0.1;
        break;
      case 'RUINS':   // Destructible terrain
        material = this.sharedMaterials.cellColors.RUINS;
        heightOffset = -0.1;
        break;
      case 'SACRED':  // Healing tiles for pieces
        material = isLight ? this.sharedMaterials.cellColors.SACRED_LIGHT : this.sharedMaterials.cellColors.SACRED_DARK;
        heightOffset = 0.15;
        break;
      case 'SWAMP':   // Movement penalty terrain
        material = isLight ? this.sharedMaterials.cellColors.SWAMP_LIGHT : this.sharedMaterials.cellColors.SWAMP_DARK;
        heightOffset = -0.05;
        break;
      default:        // PLAIN - standard chess tile
        material = isLight ? this.sharedMaterials.cellColors.PLAIN_LIGHT : this.sharedMaterials.cellColors.PLAIN_DARK;
    }

    const mesh = new THREE.Mesh(this.sharedGeometries.cell, material);
    mesh.position.set(
      offsetX + x * this.cellSize + this.cellSize / 2,
      heightOffset,
      offsetZ + y * this.cellSize + this.cellSize / 2
    );
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    if (terrainType === 'FOREST') {
      this.addTreeDecoration(mesh.position.x, mesh.position.y + 0.3, mesh.position.z);
    } else if (terrainType === 'RUINS') {
      this.addRuinDecoration(mesh.position.x, mesh.position.y + 0.1, mesh.position.z, x, y);
    } else if (terrainType === 'SACRED') {
      this.addSacredDecoration(mesh.position.x, mesh.position.y + 0.3, mesh.position.z);
    }

    return mesh;
  }

  addTreeDecoration(x, y, z) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });
    const trunk = new THREE.Mesh(this.sharedGeometries.trunk, trunkMat);
    trunk.position.set(x, y + 0.25, z);
    trunk.castShadow = true;
    this.boardGroup.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1a5a2a });
    const leaves = new THREE.Mesh(this.sharedGeometries.leaves, leavesMat);
    leaves.position.set(x, y + 0.8, z);
    leaves.castShadow = true;
    this.boardGroup.add(leaves);
  }

  addRuinDecoration(x, y, z, cellX, cellY) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
    const stone = new THREE.Mesh(this.sharedGeometries.stone, stoneMat);
    stone.position.set(x, y, z);
    const seed = cellX * 1000 + cellY;
    stone.rotation.set(
      (seed % 100) / 100 * Math.PI,
      ((seed * 7) % 100) / 100 * Math.PI,
      ((seed * 13) % 100) / 100 * Math.PI
    );
    stone.castShadow = true;
    this.boardGroup.add(stone);
  }

  addSacredDecoration(x, y, z) {
    const altarMat = new THREE.MeshStandardMaterial({ 
      color: 0xffaa00, emissive: 0x442200, roughness: 0.3, metalness: 0.5
    });
    const altar = new THREE.Mesh(this.sharedGeometries.altar, altarMat);
    altar.position.set(x, y, z);
    altar.castShadow = true;
    this.boardGroup.add(altar);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.2 });
    const glow = new THREE.Mesh(this.sharedGeometries.glow, glowMat);
    glow.position.set(x, y + 0.3, z);
    this.boardGroup.add(glow);
  }

  createPieces(state) {
    this.piecesGroup = new THREE.Group();
    state.pieces.forEach(piece => {
      const mesh = this.createPieceMesh(piece);
      this.pieceMeshes.set(piece.id, mesh);
      this.piecesGroup.add(mesh);
    });
    this.scene.add(this.piecesGroup);
  }

  createPieceMesh(piece) {
    const displayType = piece.getDisplayType();
    const geometry = this.getPieceGeometry(displayType);
    
    const isWhite = piece.owner === 0;
    const baseMaterial = isWhite ? this.sharedMaterials.whitePiece : this.sharedMaterials.blackPiece;
    const material = baseMaterial.clone();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { pieceId: piece.id, type: 'piece' };

    const pos = this.boardToWorld(piece.position.x, piece.position.y);
    mesh.position.set(pos.x, pos.y + 0.5, pos.z);

    if (piece.isGhostActive) {
      material.transparent = true;
      material.opacity = CONFIG.GHOST.OPACITY;
    }

    return mesh;
  }

  getPieceGeometry(type) {
    const geometries = {
      'PAWN': this.sharedGeometries.pawn,     // Cylinder - basic soldier
      'ROOK': this.sharedGeometries.rook,     // Tall cylinder - castle tower
      'KNIGHT': this.sharedGeometries.knight, // Cone - horse head silhouette
      'BISHOP': this.sharedGeometries.bishop, // Tall cone - bishop's mitre
      'QUEEN': this.sharedGeometries.queen,   // Sphere - crown/jewel
      'KING': this.sharedGeometries.king,     // Tall cylinder - crown
    };
    return geometries[type] || this.sharedGeometries.fallback;
  }

  // Coordinate system: Three.js uses Y for up. Board (x,y) maps to world (x, y=height, z).
  // The parameter name boardY represents the board's row index, which becomes world Z.
  boardToWorld(boardX, boardY) {
    const { offsetX, offsetZ } = this.getBoardOffsets();
    return {
      x: offsetX + boardX * this.cellSize + this.cellSize / 2,
      y: 0.15,
      z: offsetZ + boardY * this.cellSize + this.cellSize / 2
    };
  }

  worldToBoard(worldX, worldZ) {
    const { offsetX, offsetZ } = this.getBoardOffsets();
    
    const boardX = Math.floor((worldX - offsetX) / this.cellSize);
    const boardY = Math.floor((worldZ - offsetZ) / this.cellSize);

    if (boardX >= 0 && boardX < this.state.board.width && boardY >= 0 && boardY < this.state.board.height) {
      return { x: boardX, y: boardY };
    }
    return null;
  }

  createFog(state) {
    this.fogGroup = new THREE.Group();
    this.updateFog(state);
    this.scene.add(this.fogGroup);
  }

  updateFog(state) {
    const visible = state.fog.visible;
    const memory = state.fog.memory;
    const { width, height } = state.board;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        
        if (!visible.has(key)) {
          const isDark = !memory.has(key);
          if (!this.fogMeshes.has(key)) {
            const fogMesh = this.createFogTile(x, y, isDark);
            this.fogMeshes.set(key, fogMesh);
            this.fogGroup.add(fogMesh);
          } else {
            const mesh = this.fogMeshes.get(key);
            mesh.material = isDark ? this.sharedMaterials.fogDark : this.sharedMaterials.fogMemory;
          }
        } else if (this.fogMeshes.has(key)) {
          const mesh = this.fogMeshes.get(key);
          this.fogGroup.remove(mesh);
          this.fogMeshes.delete(key);
        }
      }
    }
  }

  createFogTile(x, y, isDark) {
    const pos = this.boardToWorld(x, y);
    const material = isDark ? this.sharedMaterials.fogDark : this.sharedMaterials.fogMemory;
    const mesh = new THREE.Mesh(this.sharedGeometries.fogTile, material);
    mesh.position.set(pos.x, CONFIG.FOG.CENTER_Y, pos.z);
    return mesh;
  }

  createHighlight() {
    const geometry = new THREE.RingGeometry(0.6, 0.8, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.highlightMesh = new THREE.Mesh(geometry, material);
    this.highlightMesh.rotation.x = -Math.PI / 2;
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);
  }

  highlightSquare(boardPos) {
    if (!boardPos) {
      this.highlightMesh.visible = false;
      return;
    }
    const pos = this.boardToWorld(boardPos.x, boardPos.y);
    this.highlightMesh.position.set(pos.x, 0.2, pos.z);
    this.highlightMesh.visible = true;
  }

  createAtmosphericEffects() {
    const particleCount = CONFIG.PARTICLES.AMBIENT_COUNT;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * CONFIG.BOARD.WORLD_SPAN;
      positions[i * 3 + 1] = Math.random() * CONFIG.FOG.SKY_LIMIT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.BOARD.WORLD_SPAN;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x4466aa,
      size: 0.1,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  update(state) {
    this.updatePiecePositions(state);
    this.updateFog(state);
    this.updateValidMoveHighlights(state);
    
    if (this.ambientParticles) {
      const positions = this.ambientParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.01;
        if (positions[i + 1] > CONFIG.FOG.SKY_LIMIT) positions[i + 1] = 0;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }

    this.updateParticlePool(this.sparklePool, CONFIG.PARTICLES.DECAY, CONFIG.PARTICLES.RISE_SPEED);
    this.updateParticlePool(this.explosionPool, CONFIG.PARTICLES.DECAY, CONFIG.PARTICLES.RISE_SPEED);

    this.particles = this.particles.filter(p => {
      p.life -= CONFIG.PARTICLES.DECAY;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry && p.mesh.geometry !== this.sharedGeometries.sparkle && 
            p.mesh.geometry !== this.sharedGeometries.explosion) {
          p.mesh.geometry.dispose();
        }
        if (p.mesh.material) p.mesh.material.dispose();
        return false;
      }
      p.mesh.material.opacity = p.life;
      p.mesh.position.y += CONFIG.PARTICLES.RISE_SPEED;
      return true;
    });
  }

  updateParticlePool(pool, decay, riseSpeed) {
    pool.forEach(p => {
      if (p.active) {
        p.life -= decay;
        if (p.life <= 0) {
          p.mesh.visible = false;
          p.active = false;
        } else {
          p.mesh.material.opacity = p.life;
          p.mesh.position.y += riseSpeed;
        }
      }
    });
  }

  updatePiecePositions(state) {
    state.pieces.forEach(piece => {
      const mesh = this.pieceMeshes.get(piece.id);
      if (mesh) {
        const pos = this.boardToWorld(piece.position.x, piece.position.y);
        mesh.position.x = pos.x;
        mesh.position.z = pos.z;

        if (piece.isGhostActive) {
          mesh.material.transparent = true;
          mesh.material.opacity = CONFIG.GHOST.OPACITY;
        } else {
          mesh.material.opacity = 1;
        }

        mesh.visible = this.isPieceVisible(piece, state);
      }
    });
  }

  isPieceVisible(piece, state) {
    const key = `${piece.position.x},${piece.position.y}`;
    const visible = state.fog.visible.has(key);
    const isOwnPiece = piece.owner === state.currentTurn;
    return visible || isOwnPiece;
  }

  updateValidMoveHighlights(state) {
    const newHighlighted = new Set();
    
    if (state.selectedPiece && state.validMoves) {
      state.validMoves.forEach(m => {
        const key = `${m.x},${m.y}`;
        newHighlighted.add(key);
      });
    }

    this.highlightedCells.forEach(key => {
      if (!newHighlighted.has(key)) {
        const [x, y] = key.split(',').map(Number);
        const cell = this.cellMeshes.find(c => 
          c.userData.boardX === x && c.userData.boardY === y
        );
        if (cell) {
          cell.material.emissive = new THREE.Color(0x000000);
          cell.material.emissiveIntensity = 0;
        }
      }
    });

    newHighlighted.forEach(key => {
      if (!this.highlightedCells.has(key)) {
        const [x, y] = key.split(',').map(Number);
        const cell = this.cellMeshes.find(c => 
          c.userData.boardX === x && c.userData.boardY === y
        );
        if (cell) {
          cell.material.emissive = new THREE.Color(0x004400);
          cell.material.emissiveIntensity = 0.3;
        }
      }
    });

    this.highlightedCells = newHighlighted;
  }

  render() {
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getCellAtMouse(mouseX, mouseY) {
    if (!this.container) return null;
    
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cellMeshes);

    if (intersects.length > 0) {
      const cell = intersects[0].object;
      return { x: cell.userData.boardX, y: cell.userData.boardY };
    }
    return null;
  }

  addExplosion(x, y, color) {
    const worldPos = this.boardToWorld(x, y);
    
    const pooled = this.explosionPool.find(p => !p.active);
    if (pooled) {
      pooled.mesh.material = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 1
      });
      pooled.mesh.position.set(worldPos.x, 1, worldPos.z);
      pooled.mesh.visible = true;
      pooled.active = true;
      pooled.life = 1;
      return;
    }

    const material = new THREE.MeshBasicMaterial({
      color: color, transparent: true, opacity: 1
    });
    const mesh = new THREE.Mesh(this.sharedGeometries.explosion, material);
    mesh.position.set(worldPos.x, 1, worldPos.z);
    this.scene.add(mesh);
    this.particles.push({ mesh, life: 1 });
  }

  addSparkles(x, y, color) {
    const worldPos = this.boardToWorld(x, y);
    
    for (let i = 0; i < CONFIG.EFFECTS.SPARKLE_COUNT; i++) {
      const pooled = this.sparklePool.find(p => !p.active);
      if (pooled) {
        pooled.mesh.material = new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: 1
        });
        pooled.mesh.position.set(
          worldPos.x + (Math.random() - 0.5) * 2,
          0.5 + Math.random() * 2,
          worldPos.z + (Math.random() - 0.5) * 2
        );
        pooled.mesh.visible = true;
        pooled.active = true;
        pooled.life = 1;
        continue;
      }

      const material = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 1
      });
      const mesh = new THREE.Mesh(this.sharedGeometries.sparkle, material);
      mesh.position.set(
        worldPos.x + (Math.random() - 0.5) * 2,
        0.5 + Math.random() * 2,
        worldPos.z + (Math.random() - 0.5) * 2
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, life: 1 });
    }
  }

  removePiece(pieceId) {
    const mesh = this.pieceMeshes.get(pieceId);
    if (mesh) {
      this.piecesGroup.remove(mesh);
      if (mesh.material) mesh.material.dispose();
      this.pieceMeshes.delete(pieceId);
    }
  }

  updatePiecePosition(piece) {
    const mesh = this.pieceMeshes.get(piece.id);
    if (mesh) {
      const pos = this.boardToWorld(piece.position.x, piece.position.y);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;
    }
  }

  dispose() {
    this.isInitialized = false;
    
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      if (p.mesh.geometry && !Object.values(this.sharedGeometries).includes(p.mesh.geometry)) {
        p.mesh.geometry.dispose();
      }
      if (p.mesh.material) p.mesh.material.dispose();
    });
    this.particles = [];

    this.sparklePool.forEach(p => {
      this.scene.remove(p.mesh);
      if (p.mesh.material) p.mesh.material.dispose();
    });
    this.explosionPool.forEach(p => {
      this.scene.remove(p.mesh);
      if (p.mesh.material) p.mesh.material.dispose();
    });

    this.pieceMeshes.forEach((mesh) => {
      if (mesh.material) mesh.material.dispose();
    });
    this.pieceMeshes.clear();

    this.fogMeshes.forEach((mesh) => {
      this.fogGroup.remove(mesh);
    });
    this.fogMeshes.clear();

    Object.values(this.sharedGeometries).forEach(geo => {
      if (geo && geo.dispose) geo.dispose();
    });

    Object.entries(this.sharedMaterials).forEach(([key, mat]) => {
      if (key === 'cellColors') {
        Object.values(mat).forEach(m => m.dispose());
      } else if (mat && mat.dispose) {
        mat.dispose();
      }
    });

    if (this.boardGroup) {
      this.boardGroup.traverse(child => {
        if (child.geometry && child.geometry.dispose) child.geometry.dispose();
        if (child.material && child.material.dispose) child.material.dispose();
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    window.removeEventListener('resize', this.onResize);
  }
}
