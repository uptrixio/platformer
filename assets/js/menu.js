export class MenuManager {
    constructor() {
        this.uiContainer = document.getElementById('ui-container');
        this.screens = document.querySelectorAll('.menu-screen');
        
        this.onPlay = () => {};
        this.onBackToMain = () => {};
        this.onResume = () => {};

        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('playButton').addEventListener('click', () => this.onPlay());
        document.getElementById('settingsButton').addEventListener('click', () => this.showScreen('settings-menu'));
        document.getElementById('aboutButton').addEventListener('click', () => this.showScreen('about-menu'));
        
        document.getElementById('resumeButton').addEventListener('click', () => this.onResume());
        
        document.getElementById('backToMainFromPause').addEventListener('click', () => this.onBackToMain());
        document.getElementById('backToMainFromWorlds').addEventListener('click', () => this.onBackToMain());
        document.getElementById('backToMainFromSettings').addEventListener('click', () => this.onBackToMain());
        document.getElementById('backToMainFromAbout').addEventListener('click', () => this.onBackToMain());
    }

    showScreen(screenId) {
        this.screens.forEach(screen => {
            screen.classList.remove('active');
        });
        if (screenId) {
            const screenToShow = document.getElementById(screenId);
            if(screenToShow) screenToShow.classList.add('active');
            this.uiContainer.style.display = 'flex';
        } else {
            this.uiContainer.style.display = 'none';
        }
    }
}