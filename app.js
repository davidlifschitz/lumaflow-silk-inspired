(() => {
  const canvas = document.getElementById('artCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  const controls = {
    tool: document.getElementById('toolInput'),
    symmetry: document.getElementById('symmetryInput'),
    mirror: document.getElementById('mirrorInput'),
    size: document.getElementById('sizeInput'),
    glow: document.getElementById('glowInput'),
    palette: document.getElementById('paletteInput'),
    rainbow: document.getElementById('rainbowInput'),
    undo: document.getElementById('undoBtn'),
    clear: document.getElementById('clearBtn'),
    export: document.getElementById('exportBtn'),
    audio: document.getElementById('audioBtn')
  };

  const palettes = {
    aurora: [168, 198, 244, 292],
    ember: [18, 34, 46, 332],
    ocean: [176, 190, 210, 226],
    orchid: [274, 292, 314, 340],
    moon: [0, 42, 190, 260]
  };

  let dpr = 1;
  let width = 0;
  let height = 0;
  let strokes = [];
  let activeStroke = null;
  let pointerId = null;
  let baseHue = 170;
  let audio = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function getSettings() {
    return {
      tool: controls.tool.value,
      symmetry: Number(controls.symmetry.value),
      mirror: controls.mirror.checked,
      size: Number(controls.size.value),
      glow: Number(controls.glow.value),
      palette: controls.palette.value,
      rainbow: controls.rainbow.checked,
      hue: baseHue
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function clearBackground(targetCtx = ctx, w = width, h = height) {
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.fillStyle = '#03040a';
    targetCtx.fillRect(0, 0, w, h);
    targetCtx.restore();
  }

  function normalizedPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      pressure: event.pressure && event.pressure > 0 ? event.pressure : 0.52,
      t: performance.now()
    };
  }

  function transformPoint(point, angle, mirrored, w, h) {
    let x = point.x - 0.5;
    let y = point.y - 0.5;
    if (mirrored) x = -x;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    return {
      x: (rx + 0.5) * w,
      y: (ry + 0.5) * h,
      pressure: point.pressure || 0.52
    };
  }

  function colorFor(settings, segmentIndex, strandIndex, alpha = 0.52) {
    let hue;
    if (settings.rainbow) {
      hue = (settings.hue + segmentIndex * 5 + strandIndex * 26) % 360;
    } else {
      const palette = palettes[settings.palette] || palettes.aurora;
      hue = palette[(segmentIndex + strandIndex) % palette.length];
    }

    if (settings.palette === 'moon' && !settings.rainbow) {
      const lightness = strandIndex % 2 === 0 ? 88 : 68;
      return `hsla(${hue}, 25%, ${lightness}%, ${alpha})`;
    }

    return `hsla(${hue}, 96%, 67%, ${alpha})`;
  }

  function drawSegment(targetCtx, a, b, settings, segmentIndex, w = width, h = height) {
    const transforms = [];
    for (let i = 0; i < settings.symmetry; i += 1) {
      const angle = (Math.PI * 2 * i) / settings.symmetry;
      transforms.push({ angle, mirrored: false });
      if (settings.mirror) transforms.push({ angle, mirrored: true });
    }

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'lighter';
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    for (const transform of transforms) {
      const p0 = transformPoint(a, transform.angle, transform.mirrored, w, h);
      const p1 = transformPoint(b, transform.angle, transform.mirrored, w, h);
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;
      const pressure = clamp((p0.pressure + p1.pressure) / 2, 0.18, 1);

      if (settings.tool === 'erase') {
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'source-over';
        targetCtx.shadowBlur = 0;
        targetCtx.strokeStyle = '#03040a';
        targetCtx.lineWidth = Math.max(10, settings.size * 3.2);
        targetCtx.beginPath();
        targetCtx.moveTo(p0.x, p0.y);
        targetCtx.lineTo(p1.x, p1.y);
        targetCtx.stroke();
        targetCtx.restore();
        continue;
      }

      for (let strand = 0; strand < 5; strand += 1) {
        const wave = Math.sin(segmentIndex * 0.8 + strand * 1.7 + transform.angle * 1.3);
        const spread = (strand - 2) * settings.size * 0.55 + wave * settings.size * 1.1;
        const midX = (p0.x + p1.x) / 2 + nx * spread;
        const midY = (p0.y + p1.y) / 2 + ny * spread;
        const alpha = 0.15 + (0.16 * (5 - strand)) / 5;
        const color = colorFor(settings, segmentIndex, strand, alpha);

        targetCtx.beginPath();
        targetCtx.moveTo(p0.x, p0.y);
        targetCtx.quadraticCurveTo(midX, midY, p1.x, p1.y);
        targetCtx.strokeStyle = color;
        targetCtx.shadowColor = colorFor(settings, segmentIndex, strand, 0.65);
        targetCtx.shadowBlur = settings.glow * (1.1 - strand * 0.12);
        targetCtx.lineWidth = Math.max(0.55, settings.size * pressure * (1 - strand * 0.12));
        targetCtx.stroke();
      }
    }

    targetCtx.restore();
  }

  function drawStroke(targetCtx, stroke, w = width, h = height) {
    for (let i = 1; i < stroke.points.length; i += 1) {
      drawSegment(targetCtx, stroke.points[i - 1], stroke.points[i], stroke.settings, i, w, h);
    }
  }

  function redraw() {
    clearBackground();
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (activeStroke) drawStroke(ctx, activeStroke);
  }

  function startStroke(event) {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    baseHue = (baseHue + 27) % 360;
    activeStroke = {
      settings: getSettings(),
      points: [normalizedPoint(event)]
    };
  }

  function moveStroke(event) {
    if (event.pointerId !== pointerId || !activeStroke) return;
    const next = normalizedPoint(event);
    const points = activeStroke.points;
    const previous = points[points.length - 1];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    if (Math.hypot(dx, dy) < 0.002) return;

    points.push(next);
    drawSegment(ctx, previous, next, activeStroke.settings, points.length - 1);
  }

  function endStroke(event) {
    if (event.pointerId !== pointerId || !activeStroke) return;
    if (activeStroke.points.length > 1) strokes.push(activeStroke);
    activeStroke = null;
    pointerId = null;
  }

  function undo() {
    strokes.pop();
    redraw();
  }

  function clear() {
    strokes = [];
    activeStroke = null;
    redraw();
  }

  function exportPng() {
    const scale = 3;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.floor(width * scale);
    exportCanvas.height = Math.floor(height * scale);
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.setTransform(scale, 0, 0, scale, 0, 0);
    clearBackground(exportCtx, width, height);
    for (const stroke of strokes) drawStroke(exportCtx, stroke, width, height);

    const link = document.createElement('a');
    link.download = `lumaflow-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  function toggleAudio() {
    if (audio?.playing) {
      audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.12);
      audio.playing = false;
      controls.audio.textContent = 'Sound Off';
      return;
    }

    if (!audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);

      const frequencies = [110, 165, 220, 277.18];
      const oscillators = frequencies.map((frequency, index) => {
        const oscillator = context.createOscillator();
        const oscillatorGain = context.createGain();
        oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        oscillatorGain.gain.value = 0.045;
        oscillator.connect(oscillatorGain).connect(gain);
        oscillator.start();
        return oscillator;
      });

      audio = { context, gain, oscillators, playing: false };
    }

    audio.context.resume();
    audio.gain.gain.setTargetAtTime(0.65, audio.context.currentTime, 0.22);
    audio.playing = true;
    controls.audio.textContent = 'Sound On';
  }

  canvas.addEventListener('pointerdown', startStroke);
  canvas.addEventListener('pointermove', moveStroke);
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  controls.undo.addEventListener('click', undo);
  controls.clear.addEventListener('click', clear);
  controls.export.addEventListener('click', exportPng);
  controls.audio.addEventListener('click', toggleAudio);

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.metaKey && !event.ctrlKey) undo();
    if (key === ' ') {
      event.preventDefault();
      clear();
    }
    if (key === 's' && !event.metaKey && !event.ctrlKey) exportPng();
  });

  window.addEventListener('resize', resize);
  resize();
})();
