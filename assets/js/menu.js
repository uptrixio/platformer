export class MenuManager {
    constructor() {
        this.mainMenu = document.getElementById('main-menu');
        this.settingsMenu = document.getElementById('settings-menu');
        this.aboutMenu = document.getElementById('about-menu');
        this.worldSelectMenu = document.getElementById('world-select-menu');
        this.pauseMenu = document.getElementById('pause-menu');
        this.uiContainer = document.getElementById('ui-container');

        this.playButton = document.getElementById('playButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.aboutButton = document.getElementById('aboutButton');
        
        this.resumeButton = document.getElementById('resumeButton');
        this.backToMainFromPause = document.getElementById('backToMainFromPause');
        this.backToMainFromWorlds = document.getElementById('backToMainFromWorlds');
        this.backToMainFromSettingsButton = document.getElementById('backToMainFromSettings');
        this.backToMainFromAboutButton = document.getElementById('backToMainFromAbout');

        this.setupEventListeners();
        this.showScreen(this.mainMenu);
    }

    setupEventListeners() {
        if (this.playButton) this.playButton.addEventListener('click', () => this.onPlay());
        if (this.settingsButton) this.settingsButton.addEventListener('click', () => this.showScreen(this.settingsMenu));
        if (this.aboutButton) this.aboutButton.addEventListener('click', () => this.showScreen(this.aboutMenu));
        
        if (this.resumeButton) this.resumeButton.addEventListener('click', () => this.onResume());
        if (this.backToMainFromPause) this.backToMainFromPause.addEventListener('click', () => this.onBackToMain());
        if (this.backToMainFromWorlds) this.backToMainFromWorlds.addEventListener('click', () => this.onBackToMain());
        if (this.backToMainFromSettingsButton) this.backToMainFromSettingsButton.addEventListener('click', () => this.onBackToMain());
        if (this.backToMainFromAboutButton) this.backToMainFromAboutButton.addEventListener('click', () => this.onBackToMain());
    }

    showScreen(screenToShow) {
        const screens = [this.mainMenu, this.settingsMenu, this.aboutMenu, this.worldSelectMenu, this.pauseMenu];
        screens.forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (screenToShow) {
            screenToShow.classList.add('active');
            this.uiContainer.style.display = 'flex';
        } else {
            this.uiContainer.style.display = 'none';
        }
    }

    onPlay() {}
    onBackToMain() {}
    onResume() {}
}