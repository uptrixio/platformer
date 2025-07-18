export const translations = {
    'en': {
        'Platformer': 'Platformer',
        'Play': 'Play',
        'Settings': 'Settings',
        'About': 'About',
        'Select World': 'Select World',
        'Enter new world name...': 'Enter new world name...',
        'Create New World': 'Create New World',
        'Back': 'Back',
        'Field of View (FOV):': 'Field of View (FOV):',
        'Mouse Sensitivity:': 'Mouse Sensitivity:',
        'Render Distance:': 'Render Distance:',
        'Anti-Aliasing (AA):': 'Anti-Aliasing (AA):',
        'Language:': 'Language:',
        'About Game': 'About',
        'Developed by Timur.': 'Developed by Timur.',
        'Built with Three.js': 'This is a simple voxel-based game built with Three.js.',
        'Generating World...': 'Generating World...',
        'Loading World...': 'Loading World...',
        'Paused': 'Paused',
        'Resume': 'Resume',
        'Main Menu': 'Main Menu',
        'Survival': 'Survival',
        'Creative': 'Creative',
        'No worlds yet...': 'No worlds created yet.',
        'Delete': 'Delete',
        'Nickname:': 'Nickname:',
        'block.air': 'Air',
        'block.grass': 'Grass',
        'block.dirt': 'Dirt',
        'block.stone': 'Stone',
        'block.sand': 'Sand',
        'block.water': 'Water',
        'block.wood': 'Wood',
        'block.leaves': 'Leaves',
        'block.gold': 'Gold Block',
        'block.diamond': 'Diamond Block',
        'block.lapis': 'Lapis Block',
        'block.redstone': 'Redstone Block',
        'block.coal_ore': 'Coal Ore',
        'block.iron_ore': 'Iron Ore'
    },
    'ru': {
        'Platformer': 'Платформер',
        'Play': 'Играть',
        'Settings': 'Настройки',
        'About': 'О игре',
        'Select World': 'Выберите мир',
        'Enter new world name...': 'Введите имя нового мира...',
        'Create New World': 'Создать новый мир',
        'Back': 'Назад',
        'Field of View (FOV):': 'Поле зрения (FOV):',
        'Mouse Sensitivity:': 'Чувствительность мыши:',
        'Render Distance:': 'Дальность прорисовки:',
        'Anti-Aliasing (AA):': 'Сглаживание (AA):',
        'Language:': 'Язык:',
        'About Game': 'О игре',
        'Developed by Timur.': 'Разработано Тимуром.',
        'Built with Three.js': 'Это простая воксельная игра, созданная с помощью Three.js.',
        'Generating World...': 'Генерация мира...',
        'Loading World...': 'Загрузка мира...',
        'Paused': 'Пауза',
        'Resume': 'Продолжить',
        'Main Menu': 'Главное меню',
        'Survival': 'Выживание',
        'Creative': 'Креатив',
        'No worlds yet...': 'Миры еще не созданы.',
        'Delete': 'Удалить',
        'Nickname:': 'Никнейм:',
        'block.air': 'Воздух',
        'block.grass': 'Трава',
        'block.dirt': 'Земля',
        'block.stone': 'Камень',
        'block.sand': 'Песок',
        'block.water': 'Вода',
        'block.wood': 'Дерево',
        'block.leaves': 'Листва',
        'block.gold': 'Золотой блок',
        'block.diamond': 'Алмазный блок',
        'block.lapis': 'Лазуритовый блок',
        'block.redstone': 'Редстоун блок',
        'block.coal_ore': 'Угольная руда',
        'block.iron_ore': 'Железная руда'
    },
    'zh': {
        'Platformer': '平台游戏',
        'Play': '玩',
        'Settings': '设置',
        'About': '关于',
        'Select World': '选择世界',
        'Enter new world name...': '输入新的世界名称...',
        'Create New World': '创建新世界',
        'Back': '返回',
        'Field of View (FOV):': '视野(FOV):',
        'Mouse Sensitivity:': '鼠标灵敏度:',
        'Render Distance:': '渲染距离:',
        'Anti-Aliasing (AA):': '抗锯齿 (AA):',
        'Language:': '语言:',
        'About Game': '关于',
        'Developed by Timur.': '由Timur开发。',
        'Built with Three.js': '这是一个使用Three.js构建的简单的基于体素的游戏。',
        'Generating World...': '正在生成世界...',
        'Loading World...': '加载世界...',
        'Paused': '已暂停',
        'Resume': '继续',
        'Main Menu': '主菜单',
        'Survival': '生存',
        'Creative': '创造',
        'No worlds yet...': '还没有创建世界。',
        'Delete': '删除',
        'Nickname:': '昵称：',
        'block.air': '空气',
        'block.grass': '草方块',
        'block.dirt': '泥土',
        'block.stone': '石头',
        'block.sand': '沙子',
        'block.water': '水',
        'block.wood': '木头',
        'block.leaves': '树叶',
        'block.gold': '金块',
        'block.diamond': '钻石块',
        'block.lapis': '青金石块',
        'block.redstone': '红石块',
        'block.coal_ore': '煤矿石',
        'block.iron_ore': '铁矿石'
    }
};

let currentLanguage = localStorage.getItem('gameLanguage') || 'en';

export function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('gameLanguage', lang);
    updateUIText();
}

export function t(key) {
    return translations[currentLanguage]?.[key] || translations['en'][key] || key;
}

export function updateUIText() {
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.dataset.translate;
        const translation = t(key);
        el.textContent = translation;
    });
     document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.dataset.translatePlaceholder;
        const translation = t(key);
        el.placeholder = translation;
    });
}

export function getCurrentLanguage() {
    return currentLanguage;
}