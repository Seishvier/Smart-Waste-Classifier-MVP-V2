/**
 * storage.js – localStorage helpers for history, settings, and stats
 */

const STORAGE_KEYS = {
  HISTORY: 'swc_history',
  SETTINGS: 'swc_settings',
  STATS: 'swc_stats',
  ONBOARDING: 'swc_onboarding_done'
};

const Storage = {
  /* ---------- History ---------- */
  getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveHistory(items) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(items));
  },

  addToHistory(item) {
    const history = this.getHistory();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      ...item
    };
    history.unshift(entry);
    // Keep only last 50 items
    if (history.length > 50) history.length = 50;
    this.saveHistory(history);
    this.incrementStat('scans');
    return entry;
  },

  removeFromHistory(id) {
    const history = this.getHistory().filter(item => item.id !== id);
    this.saveHistory(history);
  },

  clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  /* ---------- Stats ---------- */
  getStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATS);
      return raw ? JSON.parse(raw) : { scans: 0, saved: 0, corrections: 0 };
    } catch {
      return { scans: 0, saved: 0, corrections: 0 };
    }
  },

  incrementStat(key) {
    const stats = this.getStats();
    stats[key] = (stats[key] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return stats;
  },

  /* ---------- Settings ---------- */
  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : { theme: 'light' };
    } catch {
      return { theme: 'light' };
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  /* ---------- Onboarding ---------- */
  isOnboardingDone() {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true';
  },

  setOnboardingDone() {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
  }
};

// Expose globally
window.Storage = Storage;
