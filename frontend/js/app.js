/**
 * WASTRAQ Fleet Management Application Logic
 * Integrates API Service, Custom Chart Canvas Renderer, and Interactive Modals.
 */

import { fetchKPIs, fetchVehicles, addVehicle, addFuelRecord, deleteVehicle, deleteFuelRecord, resolveIssue, getLocalState } from './api.js';
import { renderLineChart, renderBarChart, renderDonutChart } from './charts.js';
import { initModals, openDetailModal } from './modals.js';

let state = {
  kpis: {},
  vehicles: [],
  fuelRecords: [],
  issues: [],
  audits: [],
  filters: {
    type: 'All',
    status: 'All',
    fuelType: 'All',
    search: ''
  },
  activeTab: 'dashboard'
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  initModals({
    onAddVehicle: async (vData) => {
      await addVehicle(vData);
      await loadData();
      renderAll();
    },
    onAddFuelRecord: async (fData) => {
      await addFuelRecord(fData);
      await loadData();
      renderAll();
    }
  });
  renderAll();
  setTimeout(() => {
    renderCharts();
  }, 50);
  setupChartResizeObserver();
});

async function loadData() {
  state.kpis = await fetchKPIs();
  state.vehicles = await fetchVehicles();
  const local = getLocalState();
  state.fuelRecords = local.fuelRecords;
  state.issues = local.vehicleIssues;
  state.audits = local.auditRecords;

  // Sync fuel modal vehicle select dropdown
  const vehicleSelect = document.getElementById('fuelModalVehicleSelect');
  if (vehicleSelect) {
    vehicleSelect.innerHTML = state.vehicles.map(v => 
      `<option value="${v.vehicleNo}">${v.vehicleNo} (${v.type})</option>`
    ).join('');
  }
}

function renderAll() {
  renderKPIs();
  renderVehiclesTable();
  renderFuelRecordsTable();
  renderIssuesTable();
  renderAuditRecordsTable();
  renderCharts();
}

/* Render KPI Stat Cards */
function renderKPIs() {
  const container = document.getElementById('kpiContainer');
  if (!container) return;

  const k = state.kpis;
  container.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon-box icon-blue">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Total Vehicles</span>
        <span class="kpi-value">${k.totalVehicles}</span>
        <span class="kpi-subtext">All Vehicles</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-green">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Active Vehicles</span>
        <span class="kpi-value">${k.activeVehicles}</span>
        <span class="kpi-subtext" style="color: #1E8E3E;">${k.activePercentage}% of total</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-yellow">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Inactive Vehicles</span>
        <span class="kpi-value">${k.inactiveVehicles}</span>
        <span class="kpi-subtext" style="color: #B06000;">${k.inactivePercentage}% of total</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-red">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Vehicles with Issues</span>
        <span class="kpi-value">${k.vehiclesWithIssues}</span>
        <span class="kpi-subtext" style="color: #D93025;">${k.issuesPercentage}% of total</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-purple">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"></path><path d="M13 11l4-4 2 2v9a2 2 0 0 1-2 2h-4"></path><rect x="6" y="6" width="4" height="4"></rect></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Fuel Consumed (L)</span>
        <span class="kpi-value">${k.fuelConsumedLiters.toLocaleString()} L</span>
        <span class="kpi-subtext">This Period</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-cyan">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Fuel Spend (₹)</span>
        <span class="kpi-value">₹${k.fuelSpendRupees.toLocaleString('en-IN')}</span>
        <span class="kpi-subtext">This Period</span>
      </div>
    </div>
  `;
}

/* Filter Helper */
function filterList(list, fields) {
  const { type, status, fuelType, search } = state.filters;
  return list.filter(item => {
    if (type !== 'All' && item.type && item.type !== type) return false;
    if (status !== 'All' && item.status && item.status !== status) return false;
    if (fuelType !== 'All' && item.fuelType && item.fuelType !== fuelType) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = fields.some(f => item[f] && String(item[f]).toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });
}

/* Render Tables */
function renderVehiclesTable() {
  const tbody = document.getElementById('tbodyVehicles');
  const countFooter = document.getElementById('footerVehiclesCount');
  if (!tbody) return;

  const filtered = filterList(state.vehicles, ['vehicleNo', 'type', 'driver']);
  if (countFooter) countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${state.vehicles.length} vehicles`;

  tbody.innerHTML = filtered.slice(0, 5).map(v => {
    const badgeClass = v.status === 'Active' ? 'badge-active' : v.status === 'Inactive' ? 'badge-inactive' : 'badge-maintenance';
    return `
      <tr>
        <td>
          <div class="vehicle-cell">
            <svg class="vehicle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            <strong>${v.vehicleNo}</strong>
          </div>
        </td>
        <td>${v.type}</td>
        <td><span class="badge ${badgeClass}">${v.status}</span></td>
        <td>${v.lastService}</td>
        <td style="text-align: right;">
          <div class="action-btns" style="justify-content: flex-end;">
            <button class="action-icon-btn view-vehicle" data-id="${v.id}" title="View Details">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="action-icon-btn delete-vehicle delete" data-id="${v.id}" title="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFuelRecordsTable() {
  const tbody = document.getElementById('tbodyFuelRecords');
  const countFooter = document.getElementById('footerFuelCount');
  if (!tbody) return;

  const filtered = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date']);
  if (countFooter) countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${state.fuelRecords.length} fuel records`;

  tbody.innerHTML = filtered.slice(0, 5).map(f => `
    <tr>
      <td>${f.date}</td>
      <td><strong>${f.vehicleNo}</strong></td>
      <td>${f.fuelType}</td>
      <td>${f.liters.toFixed(2)}</td>
      <td>₹${f.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right;">
        <div class="action-btns" style="justify-content: flex-end;">
          <button class="action-icon-btn view-fuel" data-id="${f.id}" title="View Details">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="action-icon-btn delete-fuel delete" data-id="${f.id}" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderIssuesTable() {
  const tbody = document.getElementById('tbodyIssues');
  const countFooter = document.getElementById('footerIssuesCount');
  if (!tbody) return;

  const filtered = filterList(state.issues, ['issueId', 'vehicleNo', 'issue', 'severity', 'status']);
  if (countFooter) countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${state.issues.length} issues`;

  tbody.innerHTML = filtered.slice(0, 5).map(i => {
    const sevClass = i.severity === 'High' ? 'badge-high' : i.severity === 'Medium' ? 'badge-medium' : 'badge-low';
    const statusClass = i.status === 'Open' ? 'badge-open' : i.status === 'In Progress' ? 'badge-in-progress' : i.status === 'Resolved' ? 'badge-resolved' : 'badge-closed';
    return `
      <tr>
        <td><strong>${i.issueId}</strong></td>
        <td>${i.vehicleNo}</td>
        <td>${i.issue}</td>
        <td><span class="badge ${sevClass}">${i.severity}</span></td>
        <td><span class="badge ${statusClass}">${i.status}</span></td>
        <td>${i.reportedOn}</td>
        <td style="text-align: right;">
          <div class="action-btns" style="justify-content: flex-end;">
            <button class="action-icon-btn resolve-issue" data-id="${i.id}" title="Resolve Issue">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAuditRecordsTable() {
  const tbody = document.getElementById('tbodyAuditRecords');
  const countFooter = document.getElementById('footerAuditCount');
  if (!tbody) return;

  const filtered = filterList(state.audits, ['user', 'action', 'entity', 'entityId', 'details']);
  if (countFooter) countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${state.audits.length} records`;

  tbody.innerHTML = filtered.slice(0, 5).map(a => `
    <tr>
      <td>${a.dateTime}</td>
      <td><strong>${a.user}</strong></td>
      <td>${a.action}</td>
      <td>${a.entity}</td>
      <td>${a.entityId}</td>
      <td class="cell-truncate" title="${a.details}">${a.details}</td>
    </tr>
  `).join('');
}

/* Render Charts */
function renderCharts() {
  const local = getLocalState();
  renderLineChart('trendChartCanvas', local.chartData.fuelTrend);
  renderDonutChart('donutVehicleTypeCanvas', local.chartData.fuelByVehicleType, `${(local.kpis.fuelConsumedLiters || 12450).toLocaleString()} L`);
  renderBarChart('barWardCanvas', local.chartData.fleetEfficiency);
  renderDonutChart('donutFuelTypeCanvas', local.chartData.fuelTypeDistribution, `${(local.kpis.fuelConsumedLiters || 12450).toLocaleString()} L`);

  updateChartLegends(local.chartData);
}

function updateChartLegends(chartData) {
  const legendVehicle = document.getElementById('legendVehicleType');
  if (legendVehicle && chartData.fuelByVehicleType) {
    const d = chartData.fuelByVehicleType;
    legendVehicle.innerHTML = d.labels.map((lbl, i) => `
      <div class="legend-item">
        <span class="legend-color-dot" style="background:${d.colors[i]};"></span>
        ${lbl} ${d.values[i].toLocaleString()} L (${d.percentages[i]}%)
      </div>
    `).join('');
  }

  const legendFuel = document.getElementById('legendFuelType');
  if (legendFuel && chartData.fuelTypeDistribution) {
    const d = chartData.fuelTypeDistribution;
    legendFuel.innerHTML = d.labels.map((lbl, i) => `
      <div class="legend-item">
        <span class="legend-color-dot" style="background:${d.colors[i]};"></span>
        ${lbl} ${d.values[i].toLocaleString()} L (${d.percentages[i]}%)
      </div>
    `).join('');
  }
}

function setupChartResizeObserver() {
  if (typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(() => {
    requestAnimationFrame(() => renderCharts());
  });

  const containers = document.querySelectorAll('.canvas-wrapper, .donut-wrapper');
  containers.forEach(el => observer.observe(el));
}

/* Event Listeners */
function setupEventListeners() {
  document.getElementById('filterType')?.addEventListener('change', (e) => {
    state.filters.type = e.target.value;
    renderAll();
  });

  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderAll();
  });

  document.getElementById('filterFuelType')?.addEventListener('change', (e) => {
    state.filters.fuelType = e.target.value;
    renderAll();
  });

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderAll();
  });

  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    state.filters = { type: 'All', status: 'All', fuelType: 'All', search: '' };
    document.getElementById('filterType').value = 'All';
    document.getElementById('filterStatus').value = 'All';
    document.getElementById('filterFuelType').value = 'All';
    document.getElementById('searchInput').value = '';
    renderAll();
  });

  window.addEventListener('resize', () => {
    renderCharts();
  });

  // Table actions delegation
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    if (target.classList.contains('view-vehicle')) {
      const id = target.dataset.id;
      const v = state.vehicles.find(item => item.id === id || item.vehicleNo === id);
      if (v) {
        openDetailModal(`Vehicle Details: ${v.vehicleNo}`, `
          <div style="display:flex; flex-direction:column; gap:10px; font-size:14px;">
            <p><strong>Registration No:</strong> ${v.vehicleNo}</p>
            <p><strong>Type:</strong> ${v.type}</p>
            <p><strong>Status:</strong> ${v.status}</p>
            <p><strong>Fuel Type:</strong> ${v.fuelType}</p>
            <p><strong>Driver:</strong> ${v.driver}</p>
            <p><strong>Last Service:</strong> ${v.lastService}</p>
            <p><strong>Odometer:</strong> ${v.mileage.toLocaleString()} km</p>
          </div>
        `);
      }
    }

    if (target.classList.contains('delete-vehicle')) {
      const id = target.dataset.id;
      await deleteVehicle(id);
      await loadData();
      renderAll();
    }

    if (target.classList.contains('delete-fuel')) {
      const id = target.dataset.id;
      await deleteFuelRecord(id);
      await loadData();
      renderAll();
    }

    if (target.classList.contains('resolve-issue')) {
      const id = target.dataset.id;
      await resolveIssue(id);
      await loadData();
      renderAll();
    }
  });

  // Sidebar Nav Tabs
  document.querySelectorAll('.nav-item, .view-all-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (!tab) return;

      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const navTarget = document.getElementById(`nav-${tab}`);
      if (navTarget) navTarget.classList.add('active');

      const titleEl = document.getElementById('page-title');
      const subEl = document.getElementById('page-subtitle');

      if (tab === 'dashboard') {
        titleEl.textContent = 'Fleet & Fuel Management Dashboard';
        subEl.textContent = 'Overview of your fleet and fuel operations';
      } else {
        const titles = {
          vehicles: 'Vehicles Management',
          fuel: 'Fuel Records & Transactions',
          issues: 'Vehicle Issues & Tickets',
          analysis: 'Analytics & Consumption Trends',
          audits: 'System Audit Records'
        };
        titleEl.textContent = titles[tab] || 'Fleet Management';
        subEl.textContent = `Detailed view of ${tab} records`;
      }
    });
  });

  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    await loadData();
    renderAll();
  });
}
