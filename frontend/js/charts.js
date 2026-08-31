/**
 * WASTRAQ Custom Canvas Chart Renderer
 * Renders high-DPI crisp Line, Bar, and Donut charts.
 */

export function renderLineChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set high DPI
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 30, right: 20, bottom: 40, left: 45 };

  ctx.clearRect(0, 0, width, height);

  const labels = data.labels;
  const values = data.values;
  const minVal = 5000;
  const maxVal = 12000;

  // Grid lines & Y Axis Labels
  ctx.strokeStyle = '#E8ECEF';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#9A9FA5';
  ctx.font = '600 10px "Plus Jakarta Sans"';

  const ySteps = [5000, 10000, 15000];
  ySteps.forEach(yVal => {
    const yRatio = (yVal - minVal) / (15000 - minVal);
    const yPos = height - padding.bottom - yRatio * (height - padding.top - padding.bottom);
    
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.fillText(`${yVal / 1000}K`, 10, yPos + 4);
  });

  // Calculate points
  const points = values.map((val, idx) => {
    const xRatio = idx / (values.length - 1);
    const xPos = padding.left + xRatio * (width - padding.left - padding.right);
    const yRatio = (val - minVal) / (15000 - minVal);
    const yPos = height - padding.bottom - yRatio * (height - padding.top - padding.bottom);
    return { x: xPos, y: yPos, label: labels[idx], value: val };
  });

  // Draw X Axis Labels
  points.forEach(pt => {
    ctx.fillStyle = '#6F767E';
    ctx.font = '600 10px "Plus Jakarta Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(pt.label, pt.x, height - 12);
  });

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

  // Draw Dots
  points.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

export function renderBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 30, right: 20, bottom: 40, left: 30 };

  ctx.clearRect(0, 0, width, height);

  const labels = data.labels;
  const values = data.values;
  const maxVal = 10;

  // Grid lines
  ctx.strokeStyle = '#E8ECEF';
  ctx.lineWidth = 1;
  [0, 2, 4, 6, 8, 10].forEach(v => {
    const yPos = height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.fillStyle = '#9A9FA5';
    ctx.font = '600 10px "Plus Jakarta Sans"';
    ctx.fillText(v, 10, yPos + 3);
  });

  const barWidth = 32;
  const step = (width - padding.left - padding.right) / labels.length;

  labels.forEach((label, i) => {
    const val = values[i];
    const xPos = padding.left + i * step + (step - barWidth) / 2;
    const barHeight = (val / maxVal) * (height - padding.top - padding.bottom);
    const yPos = height - padding.bottom - barHeight;

    // Draw Bar
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.roundRect(xPos, yPos, barWidth, barHeight, [4, 4, 0, 0]);
    ctx.fill();

    // Value Label above bar
    ctx.fillStyle = '#1A1D1F';
    ctx.font = '700 11px "Plus Jakarta Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(val.toFixed(1), xPos + barWidth / 2, yPos - 6);

    // X Axis Label
    ctx.fillStyle = '#6F767E';
    ctx.font = '600 10px "Plus Jakarta Sans"';
    ctx.fillText(label, xPos + barWidth / 2, height - 12);
  });
}

export function renderDonutChart(canvasId, data, totalText = "12,450 L") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 3 + 10;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 12;
  const innerRadius = outerRadius - 24;

  ctx.clearRect(0, 0, width, height);

  const total = data.values.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;

  data.values.forEach((val, i) => {
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

  // Center text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1A1D1F';
  ctx.font = '800 12px "Plus Jakarta Sans"';
  ctx.fillText(totalText, centerX, centerY - 6);

  ctx.fillStyle = '#9A9FA5';
  ctx.font = '600 9px "Plus Jakarta Sans"';
  ctx.fillText('Total', centerX, centerY + 8);
}
