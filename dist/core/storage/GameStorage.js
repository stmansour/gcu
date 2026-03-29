/**
 * GameStorage — key-value persistence. Capacitor Preferences in app, localStorage in browser.
 */

const PREFIX = 'grandpa';

function isCapacitor() {
  return typeof window !== 'undefined' && window.Capacitor != null;
}

export class GameStorage {
  /**
   * @param {string} namespace - Game id, e.g. 'art-studio', 'robot-lab'. Use 'global' for cross-game.
   */
  constructor(namespace) {
    this.namespace = namespace;
    this._prefix = `${PREFIX}:${namespace}:`;
  }

  _key(name) {
    return this._prefix + name;
  }

  /**
   * @param {string} name
   * @param {any} value - Will be JSON.stringify'd
   */
  async set(name, value) {
    const key = this._key(name);
    const str = JSON.stringify(value);
    try {
      if (isCapacitor() && window.Capacitor.Plugins?.Preferences) {
        await window.Capacitor.Plugins.Preferences.set({ key, value: str });
      } else {
        localStorage.setItem(key, str);
      }
    } catch (e) {
      console.warn('[GameStorage] set failed', key, e);
    }
  }

  /**
   * @param {string} name
   * @param {any} [defaultValue]
   * @returns {Promise<any>}
   */
  async get(name, defaultValue = undefined) {
    const key = this._key(name);
    try {
      let str;
      if (isCapacitor() && window.Capacitor.Plugins?.Preferences) {
        const { value } = await window.Capacitor.Plugins.Preferences.get({ key });
        str = value;
      } else {
        str = localStorage.getItem(key);
      }
      if (str == null) return defaultValue;
      return JSON.parse(str);
    } catch (e) {
      console.warn('[GameStorage] get failed', key, e);
      return defaultValue;
    }
  }

  async remove(name) {
    const key = this._key(name);
    try {
      if (isCapacitor() && window.Capacitor.Plugins?.Preferences) {
        await window.Capacitor.Plugins.Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[GameStorage] remove failed', key, e);
    }
  }

  async clear() {
    try {
      if (isCapacitor() && window.Capacitor.Plugins?.Preferences) {
        const { keys } = await window.Capacitor.Plugins.Preferences.keys();
        for (const k of keys) {
          if (k.startsWith(this._prefix)) await window.Capacitor.Plugins.Preferences.remove({ key: k });
        }
      } else {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(this._prefix)) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (e) {
      console.warn('[GameStorage] clear failed', e);
    }
  }
}
