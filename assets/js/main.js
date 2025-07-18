import { Game } from './game.js';
import { MenuManager } from './menu.js';
import { WorldManager } from './worldManager.js';
import { setLanguage, updateUIText, getCurrentLanguage } from './localization.js';

class Main {
    constructor() {
        this.gameInstance = null;
        this.menuGameInstance = null;
        this.menuManager = new MenuManager();
        this.worldManager = new WorldManager();
        this.loadingScreen = document.getElementById('loading-screen');
        this.gameContainer = document.getElementById('game-container');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showMainMenu();
        updateUIText();
    }

    setupEventListeners() {
        this.menuManager.onPlay = () => this.showWorldSelection();
        this.menuManager.onBackToMain = () => this.showMainMenu();
        this.menuManager.onResume = () => this.resumeGame();

        document.getElementById('createWorldButton').addEventListener('click', () => {
            const nameInput = document.getElementById('worldNameInput');
            const worldName = nameInput.value.trim();
            const gameMode = document.getElementById('gameModeSelect').value;
            if (worldName) {
                if (this.worldManager.createWorld(worldName, gameMode)) {
                    nameInput.value = '';
                    this.startGameWithWorld(worldName);
                } else {
                    alert('World with this name already exists.');
                }
            }
        });

        document.getElementById('worldList').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('delete-world-button')) {
                event.stopPropagation();
                const worldName = target.dataset.world;
                if (confirm(`Are you sure you want to delete world "${worldName}"?`)) {
                    this.worldManager.deleteWorld(worldName);
                    this.worldManager.renderWorldList();
                }
            } else {
                const listItem = target.closest('.world-list-item');
                if (listItem) {
                    const worldName = listItem.dataset.world;
                    this.startGameWithWorld(worldName);
                }
            }
        });

        const nicknameInput = document.getElementById('nicknameInput');
        nicknameInput.value = localStorage.getItem('nickname') || '';
        nicknameInput.addEventListener('input', () => {
            localStorage.setItem('nickname', nicknameInput.value);
            if (this.gameInstance) {
                this.gameInstance.updatePlayerNickname(nicknameInput.value);
            }
        });
        
        const fovRange = document.getElementById('fovRange');
        fovRange.addEventListener('input', () => this.updateSetting('fov', fovRange.value, 'fovValue', 0));

        const sensitivityRange = document.getElementById('sensitivityRange');
        sensitivityRange.addEventListener('input', () => this.updateSetting('mouseSensitivity', sensitivityRange.value, 'sensitivityValue', 1));

        const renderDistanceRange = document.getElementById('renderDistanceRange');
        renderDistanceRange.addEventListener('input', () => this.updateSetting('renderDistance', renderDistanceRange.value, 'renderDistanceValue'));
        
        const languageSelect = document.getElementById('languageSelect');
        languageSelect.value = getCurrentLanguage();
        languageSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }

    updateSetting(key, value, valueSpanId, toFixed = null) {
        localStorage.setItem(key, value);
        const span = document.getElementById(valueSpanId);
        if (toFixed !== null) {
             span.textContent = parseFloat(value).toFixed(toFixed);
        } else {
             span.textContent = value;
        }

        if (this.gameInstance && !this.gameInstance.isMenu) {
            this.gameInstance.applySetting(key, value);
        }
        if (this.menuGameInstance) {
             this.menuGameInstance.applySetting(key, value);
        }
    }

    showLoadingScreen(show) {
        this.loadingScreen.style.display = show ? 'flex' : 'none';
    }

    updateLoadingProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const p = Math.round(progress * 100);
        progressBar.style.width = `${p}%`;
        progressText.textContent = `${p}%`;
    }

    showMainMenu() {
        if (this.gameInstance) {
            this.gameInstance.dispose();
            this.gameInstance = null;
        }

        ['hotbar-container', 'creative-inventory-menu', 'crosshair', 'mobile-controls', 'mobile-top-buttons'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (!this.menuGameInstance) {
            this.menuGameInstance = new Game(this.gameContainer, { isMenu: true });
        }
        this.menuManager.showScreen('main-menu');
    }

    showWorldSelection() {
        this.worldManager.renderWorldList();
        this.menuManager.showScreen('world-select-menu');
    }

    startGameWithWorld(worldName) {
        const worldData = this.worldManager.getWorld(worldName);
        if (!worldData) return;

        this.menuManager.showScreen(null);

        if (this.menuGameInstance) {
            this.menuGameInstance.dispose();
            this.menuGameInstance = null;
        }
        
        const onReady = () => {
            this.showLoadingScreen(false);
            if (!worldData.generated) {
                this.worldManager.setWorldAsGenerated(worldName);
            }
        };
        
        if (!worldData.generated) {
            this.showLoadingScreen(true);
            this.updateLoadingProgress(0);
        }
        
        setTimeout(() => {
            this.gameInstance = new Game(this.gameContainer, {
                isMenu: false,
                worldData: worldData,
                onReady: onReady,
                onProgress: (p) => this.updateLoadingProgress(p)
            });
        }, 50);
    }

    resumeGame() {
        if (this.gameInstance) {
            this.gameInstance.resume();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Main();
});