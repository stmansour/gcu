const DEFAULT_ZONES = [
  { stop: 0.45, color: 'green' },
  { stop: 0.70, color: 'yellow' },
  { stop: 1.00, color: 'red' },
];

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function zoneColor(value, zones = DEFAULT_ZONES) {
  const v = clamp01(value);
  const zone = zones.find(z => v <= z.stop) || zones[zones.length - 1];
  return zone?.color || 'green';
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  return el;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function renderSegmentedMeter(root, options) {
  const value = clamp01(options.value);
  const segments = options.segments || 16;
  root.classList.add('gcu-meter', 'gcu-meter--segmented');
  root.dataset.meterValue = value.toFixed(3);

  const rail = document.createElement('div');
  rail.className = 'gcu-meter__segments';
  rail.style.setProperty('--gcu-meter-segments', String(segments));

  for (let i = 0; i < segments; i += 1) {
    const segmentValue = segments <= 1 ? 1 : i / (segments - 1);
    const segment = document.createElement('span');
    segment.className = `gcu-meter__segment gcu-meter__segment--${zoneColor(segmentValue, options.zones)}`;
    if (segmentValue <= value) segment.classList.add('gcu-meter__segment--active');
    rail.appendChild(segment);
  }
  root.appendChild(rail);

  if (options.pointer !== false) {
    const pointer = document.createElement('span');
    pointer.className = 'gcu-meter__linear-pointer';
    pointer.style.left = `${value * 100}%`;
    rail.appendChild(pointer);
  }

  if (options.leftLabel || options.midLabel || options.rightLabel) {
    const labels = document.createElement('div');
    labels.className = 'gcu-meter__labels';
    labels.innerHTML = `
      <span>${options.leftLabel || ''}</span>
      <span>${options.midLabel || ''}</span>
      <span>${options.rightLabel || ''}</span>
    `;
    root.appendChild(labels);
  }
}

function renderArcMeter(root, options) {
  const value = clamp01(options.value);
  const zones = options.zones || DEFAULT_ZONES;
  const startAngle = -112;
  const sweep = 224;
  let previousStop = 0;

  root.classList.add('gcu-meter', 'gcu-meter--arc');
  root.dataset.meterValue = value.toFixed(3);

  const svg = svgEl('svg', {
    class: 'gcu-meter__arc-svg',
    viewBox: '0 0 160 104',
    role: 'img',
    'aria-label': options.ariaLabel || 'meter',
  });
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  zones.forEach(zone => {
    const zoneStart = startAngle + sweep * previousStop;
    const zoneEnd = startAngle + sweep * clamp01(zone.stop);
    svg.appendChild(svgEl('path', {
      class: `gcu-meter__arc-zone gcu-meter__arc-zone--${zone.color}`,
      d: arcPath(80, 86, 62, zoneStart, zoneEnd),
      'pathLength': '100',
    }));
    previousStop = clamp01(zone.stop);
  });

  const needleAngle = startAngle + sweep * value;
  const needleEnd = polarToCartesian(80, 86, 46, needleAngle);
  svg.appendChild(svgEl('line', {
    class: 'gcu-meter__arc-needle',
    x1: '80',
    y1: '86',
    x2: needleEnd.x.toFixed(2),
    y2: needleEnd.y.toFixed(2),
  }));
  svg.appendChild(svgEl('circle', {
    class: 'gcu-meter__arc-hub',
    cx: '80',
    cy: '86',
    r: '6',
  }));

  root.appendChild(svg);

  if (options.leftLabel || options.rightLabel) {
    const labels = document.createElement('div');
    labels.className = 'gcu-meter__labels';
    labels.innerHTML = `
      <span>${options.leftLabel || ''}</span>
      <span></span>
      <span>${options.rightLabel || ''}</span>
    `;
    root.appendChild(labels);
  }
}

export function updateMeter(root, options = {}) {
  if (!root) return;
  root.innerHTML = '';
  root.className = root.className
    .split(/\s+/)
    .filter(cls => cls && !cls.startsWith('gcu-meter'))
    .join(' ');

  if (options.hidden) {
    root.classList.add('gcu-meter', 'gcu-meter--empty');
    return;
  }

  if (options.type === 'arc') {
    renderArcMeter(root, options);
  } else {
    renderSegmentedMeter(root, options);
  }
}
