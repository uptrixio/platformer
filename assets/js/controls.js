import * as THREE from 'three';
import { clamp, isMobile } from './utils.js';

export class Controls {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.player = game.player;
        this.domElement = game.renderer.domElement;
        
        this.isLocked = false;
        this.onLock = () => {};
        this.onUnlock = () => {};
        
        this.phi = 0;
        this.theta = 0;
        this.sensitivity = parseFloat(localStorage.getItem('mouseSensitivity') || '1.0');
        this.thirdPersonView = false;
        this.thirdPersonDistance = 5;
        
        this.keyboard = {};
        this.lastSpacePress = 0;
        
        this.touch = {
            start: new THREE.Vector2(),
            end: new THREE.Vector2(),
            startTime: 0,
            timer: null,
            longPressDuration: 500,
            maxMove: 15,
            lastTap: 0
        };

        this.init();
    }
    
    init() {
        this.camera.rotation.order = 'YXZ'; 
        
        if (isMobile()) {
            this.initMobileControls();
            this.domElement.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
            this.domElement.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
            this.domElement.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        } else {
            document.addEventListener('pointerlockchange', () => this.onPointerlockChange(), false);
            document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
            document.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        }
        
        document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
        document.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });
    }
    
    lock() {
        if(isMobile() || !this.domElement.isConnected) return Promise.reject();
        return this.domElement.requestPointerLock();
    }
    
    unlock() {
        if(isMobile()) {
            this.isLocked = false;
            this.onUnlock();
        } else {
            document.exitPointerLock();
        }
    }
    
    onPointerlockChange() {
        if (document.pointerLockElement === this.domElement) {
            this.isLocked = true;
            this.onLock();
        } else {
            this.isLocked = false;
            this.onUnlock();
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.phi -= movementX * 0.002 * this.sensitivity;
        this.theta -= movementY * 0.002 * this.sensitivity;
        this.theta = clamp(this.theta, -Math.PI / 2, Math.PI / 2);
    }
    
    updateCameraPosition() {
        this.camera.rotation.set(this.theta, this.phi, 0, 'YXZ');

        const lookAtPosition = new THREE.Vector3().copy(this.player.position);
        lookAtPosition.y += this.player.height * 0.3;

        if (this.thirdPersonView) {
            const offset = new THREE.Vector3(0, 1.2, this.thirdPersonDistance);
            offset.applyEuler(this.camera.rotation);
            this.camera.position.copy(this.player.position).add(offset);
        } else {
            this.camera.position.copy(this.player.position);
            this.camera.position.y += this.player.height * 0.4;
        }
    }

    onKeyDown(event) {
        if (!this.game.isGameActive && !this.game.isMenu) return;
        
        this.keyboard[event.code] = true;
        
        if (event.code === 'Escape') {
             if (this.game.isGameActive && this.game.creativeInventory && this.game.creativeInventory.isOpen) {
                this.game.creativeInventory.toggle();
                return;
            }
            if (this.isLocked) {
                this.unlock();
            }
        }
        
        if (event.code === 'KeyF' && this.game.isGameActive && this.game.worldData.gameMode === 'creative') {
            if (this.game.creativeInventory) {
                this.game.creativeInventory.toggle();
            }
        }
        
        if (event.code === 'Space') {
            const now = Date.now();
            if (this.game.isGameActive && this.game.worldData.gameMode === 'creative' && now - this.lastSpacePress < 300) {
                this.player.toggleFly();
            } else if (this.game.isGameActive && !this.player.isFlying) {
                this.player.jump();
            }
            this.lastSpacePress = now;
        }

        if (event.code === 'F2') {
            this.thirdPersonView = !this.thirdPersonView;
        }
        
        if (event.code.startsWith('Digit')) {
            const index = parseInt(event.code.replace('Digit', ''), 10) - 1;
            if (this.game.isGameActive && index >= 0 && index < 5 && this.game.hotbar) {
                this.game.hotbar.selectSlot(index);
            }
        }
    }
    
    onKeyUp(event) {
        this.keyboard[event.code] = false;
    }
    
    onMouseDown(event) {
        if (!this.isLocked) return;
        const isPlacement = event.button === 2;
        const isBreaking = event.button === 0;

        if (isPlacement || isBreaking) {
            this.game.world.handleBlockInteraction(this.camera, isPlacement, this.game.hotbar.getActiveItem());
        }
    }

    onMouseWheel(event) {
        if(!this.isLocked && !isMobile()) return;
        event.preventDefault();
        const direction = Math.sign(event.deltaY);
        if (this.game.hotbar) this.game.hotbar.changeSlot(direction);
    }
    
    getMoveDirection(allowFlyingY = false) {
        const direction = new THREE.Vector3();
        if (this.keyboard['KeyW']) direction.z = -1;
        if (this.keyboard['KeyS']) direction.z = 1;
        if (this.keyboard['KeyA']) direction.x = -1;
        if (this.keyboard['KeyD']) direction.x = 1;

        if (allowFlyingY) {
            if (this.keyboard['Space']) direction.y = 1;
            if (this.keyboard['ShiftLeft']) direction.y = -1;
        }

        direction.normalize();
        
        const euler = new THREE.Euler(0, this.phi, 0, 'YXZ');
        direction.applyEuler(euler);
        
        return direction;
    }

    initMobileControls() {
        const joystickContainer = document.getElementById('joystick-container');
        const joystickStick = document.getElementById('joystick-stick');
        const jumpButton = document.getElementById('jump-button');
        const pauseButton = document.getElementById('mobile-pause-button');
        const creativeButton = document.getElementById('mobile-creative-button');

        jumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onKeyDown({ code: 'Space' });
        }, {passive: false});
        jumpButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.onKeyUp({ code: 'Space' });
        }, { passive: false });

        pauseButton.addEventListener('click', () => this.unlock());
        creativeButton.addEventListener('click', () => {
             if (this.game.creativeInventory) {
                this.game.creativeInventory.toggle();
            }
        });

        if (this.game.worldData.gameMode !== 'creative') {
            creativeButton.style.display = 'none';
        }
        
        let joystickActive = false;
        let joystickStart = {x: 0, y: 0};
        
        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            joystickStart.x = e.touches[0].clientX;
            joystickStart.y = e.touches[0].clientY;
        }, {passive: false});

        joystickContainer.addEventListener('touchmove', (e) => {
            if(!joystickActive) return;
            e.preventDefault();
            const touch = e.touches[0];
            let dx = touch.clientX - joystickStart.x;
            let dy = touch.clientY - joystickStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDist = joystickContainer.offsetWidth / 2 - joystickStick.offsetWidth / 2;

            if(distance > maxDist) {
                dx *= maxDist / distance;
                dy *= maxDist / distance;
            }
            
            joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
            
            this.keyboard['KeyW'] = false;
            this.keyboard['KeyS'] = false;
            this.keyboard['KeyA'] = false;
            this.keyboard['KeyD'] = false;

            const angle = Math.atan2(dy, dx);
            if (distance > maxDist * 0.2) {
                if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) this.keyboard['KeyW'] = true;
                if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) this.keyboard['KeyS'] = true;
                if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25) this.keyboard['KeyD'] = true;
                if (angle > Math.PI * 0.75 || angle < -Math.PI * 0.75) this.keyboard['KeyA'] = true;
            }
        }, {passive: false});
        
        const endJoystick = (e) => {
            joystickActive = false;
            joystickStick.style.transform = 'translate(0,0)';
            this.keyboard['KeyW'] = this.keyboard['KeyS'] = this.keyboard['KeyA'] = this.keyboard['KeyD'] = false;
        };

        joystickContainer.addEventListener('touchend', endJoystick);
        joystickContainer.addEventListener('touchcancel', endJoystick);
    }
    
    onTouchStart(e) {
        if (e.target.closest('#mobile-controls, #mobile-top-buttons, #hotbar-container')) {
            return;
        }
        
        const touch = e.touches[0];
        this.touch.start.set(touch.clientX, touch.clientY);
        this.touch.end.set(touch.clientX, touch.clientY);
        this.touch.startTime = Date.now();
        
        this.touch.timer = setTimeout(() => {
            if (this.touch.start.distanceTo(this.touch.end) < this.touch.maxMove) {
                this.game.world.handleBlockInteraction(this.camera, false, null);
            }
            this.touch.timer = null;
        }, this.touch.longPressDuration);
    }

    onTouchMove(e) {
        if (e.target.closest('#mobile-controls, #mobile-top-buttons, #hotbar-container')) {
            return;
        }
        
        const touch = e.touches[0];
        const prevX = this.touch.end.x;
        const prevY = this.touch.end.y;
        this.touch.end.set(touch.clientX, touch.clientY);
        
        const movementX = this.touch.end.x - prevX;
        const movementY = this.touch.end.y - prevY;

        this.phi -= movementX * 0.004 * this.sensitivity;
        this.theta -= movementY * 0.004 * this.sensitivity;
        this.theta = clamp(this.theta, -Math.PI / 2, Math.PI / 2);

        if (this.touch.start.distanceTo(this.touch.end) > this.touch.maxMove) {
            clearTimeout(this.touch.timer);
            this.touch.timer = null;
        }
    }
    
    onTouchEnd(e) {
        if (this.touch.timer) {
            clearTimeout(this.touch.timer);
            this.touch.timer = null;
            this.game.world.handleBlockInteraction(this.camera, true, this.game.hotbar.getActiveItem());
        }
    }
}