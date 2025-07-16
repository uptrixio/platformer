import * as THREE from './three.module.js';
import { clamp } from './utils.js';
import { worldSettings, getHeightAt, setWorldSeed } from './world_config.js';
import { World } from './world.js';
import { MenuManager } from './menu.js';

export class Game {
    constructor(container, seed, onReady, isMenu = false, onProgress, gameMode = 'survival', worldName) {
        this.container = container;
        setWorldSeed(seed);
        this.onReady = onReady;
        this.onProgress = onProgress;
        this.isMenu = isMenu;
        this.menuManager = new MenuManager();
        this.gameMode = gameMode;
        this.worldName = worldName;
        this.saveInterval = null;

        worldSettings.renderDistance = parseInt(localStorage.getItem('renderDistance') || '8', 10);

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.scene = new THREE.Scene();
        this.world = new World(this.scene, seed);
        this.world.onProgress = this.checkInitialChunkGeneration.bind(this);
        
        this.initialChunksLoaded = false;
        const initialRenderDist = this.isMenu ? 4 : worldSettings.renderDistance;
        this.totalInitialChunks = Math.pow(initialRenderDist * 2 + 1, 2);
        
        this.player = {
            mesh: null,
            height: 1.8,
            width: 0.6,
            depth: 0.6,
            speed: 0.1,
            velocity: new THREE.Vector3(),
            isJumping: false,
            canJump: true,
            gravity: 0.008,
            jumpStrength: 0.15,
            isFlying: this.gameMode === 'creative' ? false : undefined,
            flySpeed: 0.2
        };
        
        this.debugInfo = document.getElementById('debug-info');
        this.debugVisible = false;

        this.thirdPersonView = false;
        this.lastSpacePress = 0;
        this.playerModel = null;
        
        this.keyboard = {};

        this.isGameActive = false;
        this.menuCameraPath = {
            points: [
                new THREE.Vector3(0, worldSettings.seaLevel + worldSettings.terrainHeightMultiplier / 2 + 10, 0),
                new THREE.Vector3(worldSettings.chunkSize * 4, worldSettings.seaLevel + worldSettings.terrainHeightMultiplier / 2 + 15, worldSettings.chunkSize * 4),
                new THREE.Vector3(-worldSettings.chunkSize * 4, worldSettings.seaLevel + worldSettings.terrainHeightMultiplier / 2 + 20, worldSettings.chunkSize * 4),
                new THREE.Vector3(-worldSettings.chunkSize * 4, worldSettings.seaLevel + worldSettings.terrainHeightMultiplier / 2 + 15, -worldSettings.chunkSize * 4),
                new THREE.Vector3(worldSettings.chunkSize * 4, worldSettings.seaLevel + worldSettings.terrainHeightMultiplier / 2 + 10, -worldSettings.chunkSize * 4),
            ],
            speed: 0.00005,
            currentPointIndex: 0,
            progress: 0
        };
        
        this.animationFrameId = null;

        this.init();
        this.addEventListeners();
        this.animate = this.animate.bind(this);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }
    
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.savePlayerPosition(); 
        }

        document.removeEventListener('keydown', this.keydownListener);
        document.removeEventListener('keyup', this.keyupListener);
        document.removeEventListener('mousemove', this.mousemoveListener);
        document.removeEventListener('pointerlockchange', this.pointerLockChangeListener, false);
        this.container.removeEventListener('click', this.clickListener);

        this.world.dispose();
        this.renderer.dispose();
        
        if (this.container && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.container.appendChild(this.renderer.domElement);
        this.world.setGameInstance(this);

        if (!this.isMenu) {
            this.player.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.player.width, this.player.height, this.player.depth), new THREE.MeshBasicMaterial({ visible: false, wireframe: true }));
            this.scene.add(this.player.mesh);
            
            const playerGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
            const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            this.playerModel = new THREE.Mesh(playerGeometry, playerMaterial);
            this.playerModel.visible = false;
            this.scene.add(this.playerModel);

            const savedPosition = this.loadPlayerPosition();
            if (savedPosition) {
                this.player.mesh.position.copy(savedPosition);
            } else {
                const spawnPoint = this.findSafeSpawn();
                this.player.mesh.position.copy(spawnPoint);
            }
            this.camera.rotation.x = 0;
            this.updateCameraPosition();
            
            this.saveInterval = setInterval(() => this.savePlayerPosition(), 5000);
        }

        this.camera.rotation.order = 'YXZ';
        this.scene.add(this.camera);

        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);

        this.camera.position.copy(this.menuCameraPath.points[0]);
        this.camera.lookAt(new THREE.Vector3(0, worldSettings.seaLevel, 0));

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.setupPointerLock();
        this.loadSettings();

        this.world.updateChunks(0, 0);
    }
    
    findSafeSpawn() {
        for (let r = 0; r < 120; r++) { // Increased radius to find land
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                const x = Math.round(Math.cos(a) * r);
                const z = Math.round(Math.sin(a) * r);
                const y = Math.floor(getHeightAt(x, z));
                if (y > worldSettings.seaLevel) {
                    return new THREE.Vector3(x, y + this.player.height, z);
                }
            }
        }
        return new THREE.Vector3(0, getHeightAt(0,0) + this.player.height, 0);
    }
    
    checkInitialChunkGeneration() {
        if (this.initialChunksLoaded || !this.onProgress) return;
        
        let generatedCount = 0;
        this.world.chunks.forEach(chunk => {
            if (chunk.isGenerated) {
                generatedCount++;
            }
        });
        
        const progress = Math.min(generatedCount / this.totalInitialChunks, 1.0);
        this.onProgress(progress);
        
        if (generatedCount >= this.totalInitialChunks) {
            this.initialChunksLoaded = true;
            if(this.onReady) this.onReady();
        }
    }

    addEventListeners() {
        this.container.addEventListener('contextmenu', (event) => event.preventDefault());

        this.keydownListener = (event) => {
            this.keyboard[event.code] = true;
            if (event.code === 'Escape' && document.pointerLockElement === this.container) {
                document.exitPointerLock();
            }
            if (event.code === 'F1') {
                event.preventDefault();
                this.debugVisible = !this.debugVisible;
                this.debugInfo.style.display = this.debugVisible ? 'block' : 'none';
            }
            if(event.code === 'F2') {
                this.thirdPersonView = !this.thirdPersonView;
                this.playerModel.visible = this.thirdPersonView;
            }
            if (this.gameMode === 'creative' && event.code === 'Space') {
                const time = performance.now();
                if (time - this.lastSpacePress < 300) {
                    this.player.isFlying = !this.player.isFlying;
                }
                this.lastSpacePress = time;
            }
        };

        this.keyupListener = (event) => {
            this.keyboard[event.code] = false;
        };

        this.mousemoveListener = (event) => {
            if (this.isGameActive && document.pointerLockElement === this.container) {
                const maxMovement = 50;
                const movementX = clamp(event.movementX || 0, -maxMovement, maxMovement);
                const movementY = clamp(event.movementY || 0, -maxMovement, maxMovement);
                const sensitivity = parseFloat(localStorage.getItem('mouseSensitivity') || '1.0');

                this.camera.rotation.y -= movementX * 0.002 * sensitivity;
                this.camera.rotation.x -= movementY * 0.002 * sensitivity;
                this.camera.rotation.x = clamp(this.camera.rotation.x, -Math.PI / 2, Math.PI / 2);
            }
        };

        document.addEventListener('keydown', this.keydownListener);
        document.addEventListener('keyup', this.keyupListener);
        document.addEventListener('mousemove', this.mousemoveListener);
    }
    
    setupPointerLock() {
        this.clickListener = () => {
            if (this.isGameActive && document.pointerLockElement !== this.container) {
                this.container.requestPointerLock().catch(err => {});
            }
        };
        this.container.addEventListener('click', this.clickListener);

        this.pointerLockChangeListener = this.pointerLockChange.bind(this);
        document.addEventListener('pointerlockchange', this.pointerLockChangeListener, false);
    }
    
    pointerLockChange() {
        if (document.pointerLockElement === this.container) {
            this.isGameActive = true;
            this.menuManager.showScreen(null);
        } else {
            this.isGameActive = false;
            if(!this.isMenu) {
                this.menuManager.showScreen(this.menuManager.pauseMenu);
            }
        }
    }

    isPlayerOnGround() {
        if (!this.player.mesh) return false;
        const playerBox = new THREE.Box3().setFromObject(this.player.mesh);
        playerBox.min.y -= 0.1;
        playerBox.max.y = playerBox.min.y;

        const minX = Math.floor(playerBox.min.x);
        const maxX = Math.ceil(playerBox.max.x);
        const minY = Math.floor(playerBox.min.y);
        const minZ = Math.floor(playerBox.min.z);
        const maxZ = Math.ceil(playerBox.max.z);

        for (let x = minX; x < maxX; x++) {
            for (let z = minZ; z < maxZ; z++) {
                 if (this.world.isSolidBlock(x, minY, z)) {
                     const blockBox = new THREE.Box3(new THREE.Vector3(x - 0.5, minY - 0.5, z - 0.5), new THREE.Vector3(x + 0.5, minY + 0.5, z + 0.5));
                     if (playerBox.intersectsBox(blockBox)) {
                         return true;
                     }
                 }
            }
        }
        return false;
    }

    checkBlockCollision(position) {
        const playerBox = new THREE.Box3();
        playerBox.setFromCenterAndSize(position, new THREE.Vector3(this.player.width, this.player.height, this.player.depth));
    
        const min = new THREE.Vector3(Math.floor(playerBox.min.x), Math.floor(playerBox.min.y), Math.floor(playerBox.min.z));
        const max = new THREE.Vector3(Math.ceil(playerBox.max.x), Math.ceil(playerBox.max.y), Math.ceil(playerBox.max.z));

        for (let x = min.x; x < max.x; x++) {
            for (let y = min.y; y < max.y; y++) {
                for (let z = min.z; z < max.z; z++) {
                    if (this.world.isSolidBlock(x, y, z)) {
                        const blockBox = new THREE.Box3(new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5), new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
                        if (playerBox.intersectsBox(blockBox)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    updatePlayerMovement() {
        if (!this.isGameActive || !this.player.mesh) return;

        const moveDirection = new THREE.Vector3();
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        if (this.player.isFlying) {
            this.player.velocity.y = 0;
            if (this.keyboard['Space']) this.player.velocity.y = this.player.flySpeed;
            if (this.keyboard['ShiftLeft']) this.player.velocity.y = -this.player.flySpeed;
            cameraDirection.normalize();
        } else {
            const onGround = this.isPlayerOnGround();
            if (onGround) {
                this.player.velocity.y = Math.max(0, this.player.velocity.y);
                this.player.canJump = true;
            } else {
                this.player.velocity.y -= this.player.gravity;
            }
            if (this.keyboard['Space'] && onGround) {
                this.player.velocity.y = this.player.jumpStrength;
                this.player.canJump = false;
            }
            cameraDirection.y = 0;
            cameraDirection.normalize();
        }

        const right = new THREE.Vector3().crossVectors(this.camera.up, cameraDirection).negate();
        const moveSpeed = this.player.isFlying ? this.player.flySpeed : this.player.speed;
        
        if (this.keyboard['KeyW']) moveDirection.add(cameraDirection);
        if (this.keyboard['KeyS']) moveDirection.sub(cameraDirection);
        if (this.keyboard['KeyA']) moveDirection.sub(right);
        if (this.keyboard['KeyD']) moveDirection.add(right);

        if (moveDirection.length() > 0) {
            moveDirection.normalize().multiplyScalar(moveSpeed);
        }
        
        this.player.velocity.x = moveDirection.x;
        this.player.velocity.z = moveDirection.z;
        if (this.player.isFlying) {
            this.player.velocity.y += moveDirection.y;
        }

        let pos = this.player.mesh.position.clone();
        
        pos.x += this.player.velocity.x;
        if (this.checkBlockCollision(pos)) {
            pos.x -= this.player.velocity.x;
        }
        
        pos.z += this.player.velocity.z;
        if (this.checkBlockCollision(pos)) {
            pos.z -= this.player.velocity.z;
        }

        pos.y += this.player.velocity.y;
        if (this.checkBlockCollision(pos)) {
            pos.y -= this.player.velocity.y;
            this.player.velocity.y = 0;
        }
        
        this.player.mesh.position.copy(pos);
        
        this.updateCameraPosition();
        this.world.updateChunks(this.player.mesh.position.x, this.player.mesh.position.z);
    }
    
    updateCameraPosition() {
        if (!this.player.mesh) return;

        if(this.thirdPersonView) {
            const idealOffset = new THREE.Vector3(0, 2, -4);
            idealOffset.applyQuaternion(this.camera.quaternion);
            const idealPosition = this.player.mesh.position.clone().add(idealOffset);

            this.camera.position.copy(idealPosition);
            this.camera.lookAt(this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)));

            this.playerModel.position.copy(this.player.mesh.position);
            this.playerModel.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0), this.camera.rotation.y + Math.PI);
        } else {
            this.camera.position.set(this.player.mesh.position.x, this.player.mesh.position.y + this.player.height * 0.4, this.player.mesh.position.z);
        }
    }

    updateDebugInfo() {
        if (this.debugVisible && this.player.mesh) {
            const pos = this.player.mesh.position;
            const vel = this.player.velocity;
            this.debugInfo.innerHTML = `
                X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}<br>
                VX: ${vel.x.toFixed(2)}, VY: ${vel.y.toFixed(2)}, VZ: ${vel.z.toFixed(2)}<br>
                Flying: ${this.player.isFlying ? 'Yes' : 'No'} | Grounded: ${this.isPlayerOnGround()}
            `;
        }
    }
    
    updateMenuCameraAnimation() {
        const path = this.menuCameraPath;
        const currentPoint = path.points[path.currentPointIndex];
        const nextPoint = path.points[(path.currentPointIndex + 1) % path.points.length];

        path.progress += path.speed;
        if (path.progress >= 1) {
            path.progress = 0;
            path.currentPointIndex = (path.currentPointIndex + 1) % path.points.length;
        }

        this.camera.position.lerpVectors(currentPoint, nextPoint, path.progress);
        this.camera.lookAt(new THREE.Vector3(0, worldSettings.seaLevel, 0));
    }
    
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        
        if (this.isMenu) {
            this.updateMenuCameraAnimation();
        } else if (this.isGameActive) {
            this.updatePlayerMovement();
            this.updateDebugInfo();
        }

        const pos = (this.isGameActive && this.player.mesh) ? this.player.mesh.position : this.camera.position;
        this.world.updateChunks(pos.x, pos.z);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setGameActive(active) {
        if (active) {
            this.isGameActive = true;
            this.menuManager.showScreen(null);
            this.container.requestPointerLock().catch(err => {});
        } else {
            this.isGameActive = false;
            document.exitPointerLock();
        }
    }

    setRenderDistance(distance) {
        worldSettings.renderDistance = distance;
        this.totalInitialChunks = Math.pow(worldSettings.renderDistance * 2 + 1, 2);
    }
    
    setFOV(fov) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    setMouseSensitivity(sensitivity) {
    }

    loadSettings() {
        const fov = localStorage.getItem('fov') || '90';
        this.setFOV(parseFloat(fov));
        document.getElementById('fovRange').value = fov;
        document.getElementById('fovValue').textContent = fov;

        const sensitivity = localStorage.getItem('mouseSensitivity') || '1.0';
        this.setMouseSensitivity(parseFloat(sensitivity));
        document.getElementById('sensitivityRange').value = sensitivity;
        document.getElementById('sensitivityValue').textContent = sensitivity;
        
        const renderDistance = localStorage.getItem('renderDistance') || '8';
        this.setRenderDistance(parseInt(renderDistance, 10));
        document.getElementById('renderDistanceRange').value = renderDistance;
        document.getElementById('renderDistanceValue').textContent = renderDistance;
    }

    savePlayerPosition() {
        if (this.player.mesh && this.worldName) {
            const pos = {
                x: this.player.mesh.position.x,
                y: this.player.mesh.position.y,
                z: this.player.mesh.position.z,
            };
            localStorage.setItem(`playerPos_${this.worldName}`, JSON.stringify(pos));
        }
    }

    loadPlayerPosition() {
        const savedPos = localStorage.getItem(`playerPos_${this.worldName}`);
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            return new THREE.Vector3(pos.x, pos.y, pos.z);
        }
        return null;
    }
}