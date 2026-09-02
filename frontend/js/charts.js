/**
 * WASTRAQ Custom Canvas Chart Renderer
 * Renders high-DPI crisp Line, Bar, and Donut charts.
 */

export function renderLineChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(rect.width || canvas.parentElement?.clientWidth || 500);
  const height = Math.floor(rect.height || canvas.parentElement?.clientHeight || 220);
  if (width <= 0 || height <= 0) return;

  const dpr = window.devicePixelRatio || 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const isCurrency = options.isCurrency || false;
  const unitSuffix = options.unitSuffix || '';
  const padding = { top: 32, right: 35, bottom: 38, left: isCurrency ? 60 : 50 };

  ctx.clearRect(0, 0, width, height);

  const labels = data.labels || [];
  const values = data.values || [];
  if (labels.length === 0 || values.length === 0) return;

  // Fully dynamic min and max calculation based on actual entry data
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  let minVal, maxVal;
  if (dataMin === dataMax) {
    minVal = Math.max(0, Math.floor(dataMin * 0.7));
    maxVal = Math.ceil(dataMax * 1.3) || 10;
  } else {
    const range = dataMax - dataMin;
    const rawMin = Math.max(0, dataMin - range * 0.2);
    const rawMax = dataMax + range * 0.2;

    const span = rawMax - rawMin;
    let step = 10;
    if (span <= 10) step = 2;
    else if (span <= 50) step = 10;
    else if (span <= 200) step = 20;
    else if (span <= 1000) step = 100;
    else if (span <= 5000) step = 500;
    else if (span <= 20000) step = 2000;
    else if (span <= 100000) step = 10000;
    else step = Math.pow(10, Math.floor(Math.log10(span))) / 2;

    minVal = Math.max(0, Math.floor(rawMin / step) * step);
    maxVal = Math.ceil(rawMax / step) * step;
    if (maxVal === minVal) maxVal = minVal + step;
  }

  const unitPrefix = isCurrency ? '₹' : '';

  const formatAxisLabel = (v) => {
    if (v === 0) return `${unitPrefix}0`;
    if (v >= 1000000) return `${unitPrefix}${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${unitPrefix}${(v / 1000).toFixed(1)}K`;
    return `${unitPrefix}${v}`;
  };

  const formatPointLabel = (v) => {
    if (v >= 1000000) return `${unitPrefix}${(v / 1000000).toFixed(1)}M${unitSuffix}`;
    if (v >= 1000) return `${unitPrefix}${(v / 1000).toFixed(1)}K${unitSuffix}`;
    return `${unitPrefix}${v}${unitSuffix}`;
  };

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2D3446' : '#E8ECEF';
  const axisTextColor = isDark ? '#94A3B8' : '#9A9FA5';
  const labelTextColor = isDark ? '#CBD5E1' : '#6F767E';
  const pointTextColor = isDark ? '#FFFFFF' : '#1A1D1F';
  const pointDotBg = isDark ? '#181C26' : '#FFFFFF';

  // Grid lines & Y Axis Labels (4 ticks)
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = axisTextColor;
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const ySteps = [
    minVal,
    Math.round(minVal + (maxVal - minVal) * 0.3333),
    Math.round(minVal + (maxVal - minVal) * 0.6666),
    maxVal
  ];
  ySteps.forEach(yVal => {
    const yRatio = (yVal - minVal) / (maxVal - minVal);
    const yPos = height - padding.bottom - yRatio * (height - padding.top - padding.bottom);

    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.fillText(formatAxisLabel(Math.round(yVal)), padding.left - 10, yPos);
  });

  // Calculate points
  const points = values.map((val, idx) => {
    const xRatio = values.length > 1 ? idx / (values.length - 1) : 0.5;
    const xPos = padding.left + xRatio * (width - padding.left - padding.right);
    const yRatio = Math.min(1, Math.max(0, (val - minVal) / (maxVal - minVal)));
    const yPos = height - padding.bottom - yRatio * (height - padding.top - padding.bottom);
    return { x: xPos, y: yPos, label: labels[idx], value: val };
  });

  // Draw X Axis Labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach(pt => {
    ctx.fillStyle = labelTextColor;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(pt.label, pt.x, height - padding.bottom + 10);
  });

  if (points.length === 0) return;

  // Draw Gradient Fill under curve
  const fillGrad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  fillGrad.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
  fillGrad.addColorStop(1, 'rgba(59, 130, 246, 0.00)');

  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else {
      const prev = points[i - 1];
      const cx = (prev.x + pt.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
    }
  });
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Draw Smooth Line
  ctx.beginPath();
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else {
      const prev = points[i - 1];
      const cx = (prev.x + pt.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
    }
  });
  ctx.stroke();

  // Draw Dots & Value Callouts
  points.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = pointDotBg;
    ctx.fill();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = pointTextColor;
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatPointLabel(pt.value), pt.x, pt.y - 7);
  });
}

export function renderBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(rect.width || canvas.parentElement?.clientWidth || 500);
  const height = Math.floor(rect.height || canvas.parentElement?.clientHeight || 220);
  if (width <= 0 || height <= 0) return;

  const dpr = window.devicePixelRatio || 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const padding = { top: 32, right: 30, bottom: 40, left: 40 };

  ctx.clearRect(0, 0, width, height);

  const labels = data.labels;
  const values = data.values;
  const maxVal = 10;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2D3446' : '#E8ECEF';
  const axisTextColor = isDark ? '#94A3B8' : '#9A9FA5';
  const labelTextColor = isDark ? '#CBD5E1' : '#6F767E';
  const valTextColor = isDark ? '#FFFFFF' : '#1A1D1F';

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 2, 4, 6, 8, 10].forEach(v => {
    const yPos = height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.fillStyle = axisTextColor;
    ctx.font = '600 11px "Plus Jakarta Sans"';
    ctx.fillText(v, padding.left - 8, yPos);
  });

  const step = (width - padding.left - padding.right) / labels.length;
  const barWidth = Math.min(36, step * 0.45);

  labels.forEach((label, i) => {
    const val = values[i];
    const xPos = padding.left + i * step + (step - barWidth) / 2;
    const barHeight = (val / maxVal) * (height - padding.top - padding.bottom);
    const yPos = height - padding.bottom - barHeight;

    // Draw Bar
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    if (barHeight > 4) {
      ctx.roundRect(xPos, yPos, barWidth, barHeight, [4, 4, 0, 0]);
    } else {
      ctx.rect(xPos, yPos, barWidth, barHeight);
    }
    ctx.fill();

    // Value Label above bar
    ctx.fillStyle = valTextColor;
    ctx.font = '700 12px "Plus Jakarta Sans"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(val.toFixed(1), xPos + barWidth / 2, yPos - 6);

    // X Axis Label
    ctx.fillStyle = labelTextColor;
    ctx.font = '600 11px "Plus Jakarta Sans"';
    ctx.textBaseline = 'top';
    ctx.fillText(label, xPos + barWidth / 2, height - padding.bottom + 10);
  });
}

export function renderDonutChart(canvasId, data, totalText = "12,450 L") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(rect.width || canvas.parentElement?.clientWidth || 160);
  const height = Math.floor(rect.height || canvas.parentElement?.clientHeight || 160);
  if (width <= 0 || height <= 0) return;

  const dpr = window.devicePixelRatio || 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 10;
  const innerRadius = Math.max(15, outerRadius - 22);

  ctx.clearRect(0, 0, width, height);

  const total = data.values.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const centerTextColor = isDark ? '#FFFFFF' : '#1A1D1F';
  const centerSubtextColor = isDark ? '#CBD5E1' : '#9A9FA5';
  const emptyRingColor = isDark ? '#2D3446' : '#E2E8F0';

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
    ctx.closePath();
    ctx.fillStyle = emptyRingColor;
    ctx.fill();
  } else {
    data.values.forEach((val, i) => {
      if (val === 0) return;
      const sliceAngle = (val / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = data.colors[i];
      ctx.fill();

      startAngle = endAngle;
    });
  }

  // Center text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = centerTextColor;
  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(totalText, centerX, centerY - 6);

  ctx.fillStyle = centerSubtextColor;
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Total', centerX, centerY + 8);
}
