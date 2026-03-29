/**
 * CircuitEngine — Graph-based binary power propagation.
 *
 * Components have terminals (e.g. 'plus', 'minus').
 * Wires connect one terminal to another.
 * Power flows from battery + through wires and components, back to battery −.
 * A component is "powered" if it lies on a complete closed loop.
 */

export class CircuitEngine {
  constructor() {
    /** @type {Map<string, {id:string, type:string, terminals:string[], powered:boolean, open?:boolean}>} */
    this.components = new Map();
    /** @type {Array<{id:string, from:string, to:string}>} wire from/to are "compId:termId" */
    this.wires = [];
    this._nextWireId = 0;
  }

  /**
   * Register a component.
   * @param {string} id
   * @param {'battery'|'led'|'switch'} type
   * @param {string[]} terminals  e.g. ['plus','minus']
   * @param {object} [extra]      e.g. { open: false } for a switch
   */
  addComponent(id, type, terminals, extra = {}) {
    this.components.set(id, { id, type, terminals, powered: false, ...extra });
  }

  /**
   * Add a wire between two terminals.
   * @param {string} fromKey  "compId:termId"
   * @param {string} toKey    "compId:termId"
   * @returns {string} wire id
   */
  addWire(fromKey, toKey) {
    const id = `w${this._nextWireId++}`;
    this.wires.push({ id, from: fromKey, to: toKey });
    return id;
  }

  /** Remove a wire by id. */
  removeWire(wireId) {
    this.wires = this.wires.filter(w => w.id !== wireId);
  }

  /**
   * Solve the circuit.
   * Returns a Map<compId, boolean> showing which components are powered.
   * Also updates comp.powered in-place.
   */
  solve() {
    // Build undirected adjacency between terminal keys
    const adj = new Map();
    const edge = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    };

    // Wires connect terminals across components
    for (const wire of this.wires) {
      edge(wire.from, wire.to);
    }

    // Each non-battery component connects all its own terminals internally
    // (power passes through an LED, resistor, inductor, or closed switch)
    for (const comp of this.components.values()) {
      if (comp.type === 'battery') continue;
      if (comp.type === 'switch' && comp.open) continue; // open switch blocks flow
      if (comp.type === 'capacitor') continue;           // capacitor blocks DC
      for (let i = 0; i < comp.terminals.length; i++) {
        for (let j = i + 1; j < comp.terminals.length; j++) {
          edge(`${comp.id}:${comp.terminals[i]}`, `${comp.id}:${comp.terminals[j]}`);
        }
      }
    }

    // BFS from every battery's + terminal; circuit is closed if we reach that battery's − terminal
    const poweredMap = new Map();
    for (const id of this.components.keys()) poweredMap.set(id, false);

    for (const batt of this.components.values()) {
      if (batt.type !== 'battery') continue;

      const startKey  = `${batt.id}:plus`;
      const targetKey = `${batt.id}:minus`;

      const visited    = new Set([startKey]);
      const queue      = [startKey];
      const visitedComps = new Set([batt.id]);
      let   closed     = false;

      while (queue.length > 0 && !closed) {
        const cur = queue.shift();
        const compId = cur.split(':')[0];
        visitedComps.add(compId);

        for (const neighbor of (adj.get(cur) ?? [])) {
          if (neighbor === targetKey) { closed = true; break; }
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      if (closed) {
        for (const id of visitedComps) poweredMap.set(id, true);
        poweredMap.set(batt.id, true);
      }
    }

    // Write back into component objects
    for (const [id, comp] of this.components) {
      comp.powered = poweredMap.get(id) ?? false;
    }

    return poweredMap;
  }

  /** Convenience: is a specific component currently powered? */
  isPowered(compId) {
    return this.components.get(compId)?.powered ?? false;
  }

  /**
   * Solve as if `skipCompId` were an open switch (no internal pass-through).
   * Used to test whether other components are powered via a direct path
   * that bypasses the skipped component.
   * @param {string} skipCompId
   * @returns {Map<string, boolean>}
   */
  solveWithout(skipCompId) {
    return this.solveWith(skipCompId, 'switch', true);
  }

  /**
   * Solve as if `compId` were temporarily a different type.
   * Useful for detecting capacitor paths (treat capacitor as conductor).
   * @param {string} compId
   * @param {string} asType   — the temporary type to assign
   * @param {boolean} [open]  — if true, also sets comp.open = true
   * @returns {Map<string, boolean>}
   */
  solveWith(compId, asType, open = false) {
    const comp = this.components.get(compId);
    if (!comp) return this.solve();
    const savedType = comp.type;
    const savedOpen = comp.open;
    comp.type = asType;
    comp.open = open;
    const result = this.solve();
    comp.type = savedType;
    comp.open = savedOpen;
    return result;
  }
}
