import { Game } from './game.js';
import { MenuManager } from './menu.js';
import { WorldManager } from './worldManager.js';
import { setLanguage, updateUIText, getCurrentLanguage } from './localization.js';

let gameInstance = null;
let menuManager;
let worldManager;
let loadingScreen;
let menuGameInstance = null;
let currentWorldName = null;

function showLoadingScreen(show) {
    loadingScreen.style.display = show ? 'flex' : 'none';
}

function updateLoadingProgress(progress) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const p = Math.round(progress * 100);
    progressBar.style.width = `${p}%`;
    progressText.textContent = `${p}%`;
}

function showMainMenu() {
    if (gameInstance) {
        gameInstance.dispose();
        gameInstance = null;
    }
    if (!menuGameInstance) {
        const gameContainer = document.getElementById('game-container');
        menuGameInstance = new Game(gameContainer, 'menu_seed', () => {}, true);
    }
    menuManager.showScreen(menuManager.mainMenu);
}

function showWorldSelection() {
    worldManager.renderWorldList();
    menuManager.showScreen(menuManager.worldSelectMenu);
}

async function startGameWithWorld(worldName) {
    currentWorldName = worldName;
    const worldData = worldManager.getWorld(worldName);

    if (worldData) {
        if(menuGameInstance) {
            menuGameInstance.dispose();
            menuGameInstance = null;
        }

        const gameContainer = document.getElementById('game-container');

        if(worldManager.isWorldGenerated(worldName)) {
            showLoadingScreen(false);
            gameInstance = new Game(gameContainer, worldData.seed, () => {}, false, null, worldData.gameMode);
        } else {
            showLoadingScreen(true);
            updateLoadingProgress(0);
            await new Promise(resolve => setTimeout(resolve, 50));
            gameInstance = new Game(gameContainer, worldData.seed, () => {
                showLoadingScreen(false);
                worldManager.setWorldAsGenerated(worldName);
            }, false, updateLoadingProgress, worldData.gameMode);
        }

        window.gameInstance = gameInstance;
        gameInstance.setGameActive(true);
    }
}

function resumeGame() {
    if (gameInstance) {
        gameInstance.setGameActive(true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadingScreen = document.getElementById('loading-screen');
    menuManager = new MenuManager();
    worldManager = new WorldManager();

    showMainMenu();

    menuManager.onPlay = showWorldSelection;
    menuManager.onBackToMain = showMainMenu;
    menuManager.onResume = resumeGame;

    document.getElementById('createWorldButton').addEventListener('click', () => {
        const nameInput = document.getElementById('worldNameInput');
        const worldName = nameInput.value.trim();
        const gameMode = document.getElementById('gameModeSelect').value;
        if (worldName) {
            worldManager.createWorld(worldName, gameMode);
            nameInput.value = '';
            worldManager.renderWorldList();
        }
    });

    document.getElementById('worldList').addEventListener('click', (event) => {
        const target = event.target;
        const listItem = target.closest('.world-list-item');
        if (target.classList.contains('delete-world-button')) {
            event.stopPropagation();
            const worldName = target.dataset.world;
            if (confirm(`Are you sure you want to delete world "${worldName}"?`)) {
                worldManager.deleteWorld(worldName);
                worldManager.renderWorldList();
            }
        } else if (listItem) {
            const worldName = listItem.dataset.world;
            startGameWithWorld(worldName);
        }
    });

    const fovRange = document.getElementById('fovRange');
    const fovValueSpan = document.getElementById('fovValue');
    fovRange.addEventListener('input', () => {
        const fov = parseFloat(fovRange.value);
        fovValueSpan.textContent = fov.toFixed(0);
        localStorage.setItem('fov', fov);
        if (gameInstance && !gameInstance.isMenu) gameInstance.setFOV(fov);
    });

    const sensitivityRange = document.getElementById('sensitivityRange');
    const sensitivityValueSpan = document.getElementById('sensitivityValue');
    sensitivityRange.addEventListener('input', () => {
        const sensitivity = parseFloat(sensitivityRange.value);
        sensitivityValueSpan.textContent = sensitivity.toFixed(1);
        localStorage.setItem('mouseSensitivity', sensitivity);
    });

    const renderDistanceRange = document.getElementById('renderDistanceRange');
    const renderDistanceValueSpan = document.getElementById('renderDistanceValue');
    renderDistanceRange.addEventListener('input', () => {
        const distance = parseInt(renderDistanceRange.value, 10);
        renderDistanceValueSpan.textContent = distance;
        localStorage.setItem('renderDistance', distance);
        if (gameInstance && !gameInstance.isMenu) gameInstance.setRenderDistance(distance);
    });

    const languageSelect = document.getElementById('languageSelect');
    languageSelect.value = getCurrentLanguage();
    languageSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    updateUIText();
});