/**
 * EventBus — pub/sub for decoupled messaging.
 */

let instance = null;

export class EventBus {
  static getInstance() {
    if (!instance) instance = new EventBus();
    return instance;
  }

  constructor() {
    this._handlers = new Map();
  }

  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._handlers.get(event);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i !== -1) list.splice(i, 1);
  }

  emit(event, data) {
    (this._handlers.get(event) || []).forEach((fn) => fn(data));
  }
}
