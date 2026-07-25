// storage.js
export const Keys = {
    HISTORY: 'promptai_history',
    FAVORITES: 'promptai_favorites',
    SETTINGS: 'promptai_settings',
    QUOTA: 'promptai_quota',
    LANGUAGE: 'promptai_language',
    THEME: 'promptai_theme',
    RECENT_FILES: 'promptai_recent_files'
};

export function save(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to storage', e);
    }
}

export function load(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Error loading from storage', e);
        return defaultValue;
    }
}

export function remove(key) {
    localStorage.removeItem(key);
}

// History
export function addToHistory(entry) {
    let history = getHistory();
    history.unshift(entry);
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    save(Keys.HISTORY, history);
}

export function getHistory() {
    return load(Keys.HISTORY, []);
}

export function removeFromHistory(id) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    save(Keys.HISTORY, history);
}

export function clearHistory() {
    remove(Keys.HISTORY);
}

export function searchHistory(query) {
    const history = getHistory();
    const q = query.toLowerCase();
    return history.filter(item => {
        const filename = item.filename?.toLowerCase() || '';
        const engine = item.engine?.toLowerCase() || '';
        const prompts = (item.prompts || []).join(' ').toLowerCase();
        return filename.includes(q) || engine.includes(q) || prompts.includes(q);
    });
}

// Favorites
export function addToFavorites(entry) {
    let favorites = getFavorites();
    if (!favorites.find(item => item.id === entry.id)) {
        favorites.unshift(entry);
        save(Keys.FAVORITES, favorites);
    }
}

export function getFavorites() {
    return load(Keys.FAVORITES, []);
}

export function removeFromFavorite(id) {
    let favorites = getFavorites();
    favorites = favorites.filter(item => item.id !== id);
    save(Keys.FAVORITES, favorites);
}

export function isFavorite(id) {
    const favorites = getFavorites();
    return favorites.some(item => item.id === id);
}

// Settings
export function getSettings() {
    return load(Keys.SETTINGS, { theme: 'system', language: 'en', quality: 'high' });
}

export function saveSettings(settings) {
    save(Keys.SETTINGS, settings);
}

// Recent Files
export function addRecentFile(fileInfo) {
    let files = getRecentFiles();
    files = files.filter(f => f.name !== fileInfo.name);
    files.unshift(fileInfo);
    if (files.length > 10) {
        files = files.slice(0, 10);
    }
    save(Keys.RECENT_FILES, files);
}

export function getRecentFiles() {
    return load(Keys.RECENT_FILES, []);
}
