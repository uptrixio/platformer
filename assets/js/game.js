import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { Controls } from './controls.js';
import { MenuManager } from './menu.js';
import { Hotbar } from './hotbar.js';
import { CreativeInventory } from './creative_inventory.js';
import { worldSettings } from './world_config.js';
import { isMobile } from './utils.js';

export class Game {
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this.isMenu = options.isMenu;
        this.worldData = options.worldData || { seed: 'menu_seed', gameMode: 'creative' };
        
        this.isGameActive = false;
        this.isReady = false;
        this.animationFrameId = null;
        this.menuManager = new MenuManager();

        this.initRenderer();
        this.initScene();
        
        const renderDistance = this.isMenu ? 4 : (parseInt(localStorage.getItem('renderDistance')) || 8);
        this.world = new World(this, renderDistance);

        if (!this.isMenu) {
            this.player = new Player(this);
            this.controls = new Controls(this);
            this.hotbar = new Hotbar(this);
            this.player.loadState();
            if (this.worldData.gameMode === 'creative') {
                this.creativeInventory = new CreativeInventory(this);
            }
        }
        
        this.init();
        this.animate = this.animate.bind(this);
        this.animate();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.container.appendChild(this.renderer.domElement);
    }

    initScene() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.scene = new THREE.Scene();
        
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);
    }

    init() {
        if (this.isMenu) {
            this.world.onInitialChunksGenerated = () => { this.isReady = true; };
            this.camera.position.set(0, worldSettings.seaLevel + 40, 0);
            this.camera.lookAt(0, worldSettings.seaLevel, 0);
            this.world.startInitialGeneration(this.camera.position);
        } else {
             this.world.onInitialChunksGenerated = () => {
                this.isReady = true;
                if (this.options.onReady) this.options.onReady();
             };
             this.world.onProgress = this.options.onProgress;
             this.player.spawn();
             this.world.startInitialGeneration(this.player.position);
        }

        window.addEventListener('resize', () => this.onWindowResize(), false);
        if (!this.isMenu) {
             this.setupGameInteraction();
        }
        this.loadSettings();
    }

    applySetting(key, value) {
        switch (key) {
            case 'fov':
                this.camera.fov = parseFloat(value);
                this.camera.updateProjectionMatrix();
                break;
            case 'mouseSensitivity':
                if(this.controls) this.controls.sensitivity = parseFloat(value);
                break;
            case 'renderDistance':
                if(this.world) this.world.setRenderDistance(parseInt(value, 10));
                break;
        }
    }

    loadSettings() {
        this.applySetting('fov', localStorage.getItem('fov') || '90');
        this.applySetting('mouseSensitivity', localStorage.getItem('mouseSensitivity') || '1.0');
        this.applySetting('renderDistance', localStorage.getItem('renderDistance') || '8');
    }

    setupGameInteraction() {
        this.controls.onLock = () => {
            this.isGameActive = true;
            this.menuManager.showScreen(null);
            document.getElementById('crosshair').style.display = 'block';
            if (this.hotbar) this.hotbar.show();
            if (isMobile()) {
                document.getElementById('mobile-controls').style.display = 'flex';
                document.getElementById('mobile-top-buttons').style.display = 'flex';
            }
        };

        this.controls.onUnlock = () => {
            if (this.creativeInventory && this.creativeInventory.isOpen) {
                return;
            }
            this.isGameActive = false;
            this.menuManager.showScreen('pause-menu');
            document.getElementById('crosshair').style.display = 'none';
            if (this.hotbar) this.hotbar.hide();
            if (isMobile()) {
                document.getElementById('mobile-controls').style.display = 'none';
                document.getElementById('mobile-top-buttons').style.display = 'none';
            }
        };
        
        if (isMobile()) {
             this.controls.isLocked = true;
             this.controls.onLock();
        } else {
            const lockFunction = () => {
                 if (this.isReady && !this.isGameActive && !(this.creativeInventory && this.creativeInventory.isOpen)) {
                    this.controls.lock().catch(e => {});
                }
            }
            this.container.addEventListener('click', lockFunction);
        }
    }

    resume() {
        if (isMobile()) {
            this.controls.isLocked = true;
            this.controls.onLock();
        } else {
            this.controls.lock().catch(e => {});
        }
    }

    updatePlayerNickname(nickname) {
        if (this.player && this.player.model) {
            this.player.updateNickname(nickname);
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        const delta = this.world.clock.getDelta();
        const center = this.isMenu ? this.camera.position : this.player.position;

        if (this.world.initialGenerationDone || this.isMenu) {
            if (!this.isMenu && this.isGameActive) {
                this.player.update(delta);
            }
            this.world.update(center);
        } else {
            this.world.processChunkGenerationQueue(center);
        }

        if(this.isMenu) {
            this.camera.position.x = Math.sin(this.world.clock.elapsedTime * 0.1) * 60;
            this.camera.position.z = Math.cos(this.world.clock.elapsedTime * 0.1) * 60;
            this.camera.lookAt(0, worldSettings.seaLevel, 0);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    dispose() {
        cancelAnimationFrame(this.animationFrameId);
        if (this.player) this.player.saveState();
        if (this.world) this.world.dispose();
        if (this.renderer) {
            this.renderer.dispose();
             if (this.renderer.domElement && this.renderer.domElement.parentElement === this.container) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
    }
}