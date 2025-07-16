import { isMobile } from './utils.js';

class MobileControls {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.controlsContainer = document.getElementById('mobile-controls');
        this.joystickContainer = document.getElementById('joystick-container');
        this.joystickStick = document.getElementById('joystick-stick');
        this.jumpButton = document.getElementById('jump-button');
        
        this.joystickActive = false;
        this.joystickStartPos = { x: 0, y: 0 };
        this.joystickCurrentPos = { x: 0, y: 0 };
        this.joystickRadius = this.joystickContainer.offsetWidth / 2;

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!isMobile()) return;

        this.controlsContainer.style.display = 'flex';

        this.joystickContainer.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        this.joystickContainer.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        this.joystickContainer.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
        
        this.jumpButton.addEventListener('touchstart', (e) => this.onJumpStart(e), { passive: false });
        this.jumpButton.addEventListener('touchend', (e) => this.onJumpEnd(e), { passive: false });
    }
    
    onJoystickStart(e) {
        e.preventDefault();
        this.joystickActive = true;
        const touch = e.touches[0];
        this.joystickStartPos = { x: touch.clientX, y: touch.clientY };
    }

    onJoystickMove(e) {
        e.preventDefault();
        if (!this.joystickActive) return;

        const touch = e.touches[0];
        this.joystickCurrentPos = { x: touch.clientX, y: touch.clientY };

        let dx = this.joystickCurrentPos.x - this.joystickStartPos.x;
        let dy = this.joystickCurrentPos.y - this.joystickStartPos.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.joystickRadius - this.joystickStick.offsetWidth / 2;

        if (distance > maxDist) {
            dx *= maxDist / distance;
            dy *= maxDist / distance;
        }

        this.joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;

        const angle = Math.atan2(dy, dx);
        const keyboard = this.game.keyboard;

        keyboard['KeyW'] = false;
        keyboard['KeyS'] = false;
        keyboard['KeyA'] = false;
        keyboard['KeyD'] = false;

        if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) keyboard['KeyW'] = true; // Up
        if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) keyboard['KeyS'] = true; // Down
        if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25) keyboard['KeyD'] = true; // Right
        if (angle > Math.PI * 0.75 || angle < -Math.PI * 0.75) keyboard['KeyA'] = true; // Left

    }

    onJoystickEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
        this.joystickStick.style.transform = `translate(0px, 0px)`;
        
        const keyboard = this.game.keyboard;
        keyboard['KeyW'] = false;
        keyboard['KeyS'] = false;
        keyboard['KeyA'] = false;
        keyboard['KeyD'] = false;
    }

    onJumpStart(e) {
        e.preventDefault();
        this.game.keyboard['Space'] = true;
    }

    onJumpEnd(e) {
        e.preventDefault();
        this.game.keyboard['Space'] = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.gameInstance) {
        new MobileControls(window.gameInstance);
    }
});