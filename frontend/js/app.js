/**
 * WASTRAQ Fleet Management Application Logic
 * Integrates API Service, Custom Chart Canvas Renderer, and Interactive Modals.
 */

import { fetchKPIs, fetchVehicles, addVehicle, addFuelRecord, deleteVehicle, updateVehicleStatus, deleteFuelRecord, resolveIssue, updateIssueStatus, getLocalState } from './api.js';
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
    search: '',
    startDate: null,
    endDate: null
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

/* Parse Date Helper */
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr === 'Just now') return new Date();

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const match = String(dateStr).trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = months[match[2].toLowerCase().slice(0, 3)];
    const year = parseInt(match[3], 10);
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

/* Filter Helper */
function filterList(list, fields = [], dateField = null) {
  const { type, status, fuelType, search, startDate, endDate } = state.filters;

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

  return list.filter(item => {
    if (type !== 'All' && item.type && item.type !== type) return false;
    if (status !== 'All' && item.status && item.status !== status) return false;
    if (fuelType !== 'All' && item.fuelType && item.fuelType !== fuelType) return false;

    if (dateField && (start || end)) {
      const itemDateStr = item[dateField];
      if (itemDateStr) {
        const itemDate = parseDate(itemDateStr);
        if (itemDate) {
          if (start && itemDate < start) return false;
          if (end && itemDate > end) return false;
        }
      }
    }

    if (search) {
      const s = search.toLowerCase();
      const match = fields.some(f => item[f] && String(item[f]).toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });
}

/* Render KPI Stat Cards */
function renderKPIs() {
  const container = document.getElementById('kpiContainer');
  if (!container) return;

  const filteredVehicles = filterList(state.vehicles, ['vehicleNo', 'type', 'driver'], 'lastService');
  const filteredFuelRecords = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date'], 'date');
  const filteredIssues = filterList(state.issues, ['issueId', 'vehicleNo', 'issue', 'severity', 'status'], 'reportedOn');

  const totalV = filteredVehicles.length;
  const activeV = filteredVehicles.filter(v => v.status === 'Active').length;
  const activePct = totalV > 0 ? ((activeV / totalV) * 100).toFixed(1) : 0;

  const inactiveV = filteredVehicles.filter(v => v.status === 'Inactive').length;
  const inactivePct = totalV > 0 ? ((inactiveV / totalV) * 100).toFixed(1) : 0;

  const issuesV = filteredIssues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
  const issuesPct = totalV > 0 ? ((issuesV / totalV) * 100).toFixed(1) : 0;

  const fuelLiters = Math.round(filteredFuelRecords.reduce((sum, f) => sum + (f.liters || 0), 0));
  const fuelSpend = Math.round(filteredFuelRecords.reduce((sum, f) => sum + (f.amount || 0), 0));

  container.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon-box icon-blue">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Total Vehicles</span>
        <span class="kpi-value">${totalV}</span>
        <span class="kpi-subtext">Filtered Vehicles</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-green">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Active Vehicles</span>
        <span class="kpi-value">${activeV}</span>
        <span class="kpi-subtext" style="color: #1E8E3E;">${activePct}% of total</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-yellow">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Inactive Vehicles</span>
        <span class="kpi-value">${inactiveV}</span>
        <span class="kpi-subtext" style="color: #B06000;">${inactivePct}% of total</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-red">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Vehicles with Issues</span>
        <span class="kpi-value">${issuesV}</span>
        <span class="kpi-subtext" style="color: #D93025;">${issuesPct}% of total</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-purple">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"></path><path d="M13 11l4-4 2 2v9a2 2 0 0 1-2 2h-4"></path><rect x="6" y="6" width="4" height="4"></rect></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Fuel Consumed (L)</span>
        <span class="kpi-value">${fuelLiters.toLocaleString()} L</span>
        <span class="kpi-subtext">Selected Period</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon-box icon-cyan">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">Fuel Spend (₹)</span>
        <span class="kpi-value">₹${fuelSpend.toLocaleString('en-IN')}</span>
        <span class="kpi-subtext">Selected Period</span>
      </div>
    </div>
  `;
}

/* Render Tables */
function renderVehiclesTable() {
  const tbody = document.getElementById('tbodyVehicles');
  const countFooter = document.getElementById('footerVehiclesCount');
  if (!tbody) return;

  const filtered = filterList(state.vehicles, ['vehicleNo', 'type', 'driver'], 'lastService');
  if (countFooter) {
    if (filtered.length === 0) {
      countFooter.textContent = `Showing 0 of ${state.vehicles.length} vehicles`;
    } else {
      countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${filtered.length} vehicles`;
    }
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <strong>No Data Found</strong>
            <span style="font-size: 12px;">No vehicles match the selected filter criteria</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 5).map(v => {
    const badgeClass = v.status === 'Active' ? 'badge-active' : v.status === 'Inactive' ? 'badge-inactive' : v.status === 'Maintenance' ? 'badge-maintenance' : 'badge-out-of-service';
    const statuses = [
      { key: 'Active', dotClass: 'dot-active' },
      { key: 'Inactive', dotClass: 'dot-inactive' },
      { key: 'Maintenance', dotClass: 'dot-maintenance' },
      { key: 'Out of Service', dotClass: 'dot-out-of-service' }
    ];

    const menuItemsHtml = statuses.map(s => `
      <div class="status-menu-item ${v.status === s.key ? 'active' : ''}" data-value="${s.key}">
        <span class="dot ${s.dotClass}"></span>
        <span>${s.key}</span>
        ${v.status === s.key ? '<svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      </div>
    `).join('');

    return `
      <tr>
        <td>
          <div class="vehicle-cell">
            <svg class="vehicle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            <strong>${v.vehicleNo}</strong>
          </div>
        </td>
        <td>${v.type}</td>
        <td>
          <div class="custom-status-dropdown" data-id="${v.id || v.vehicleNo}">
            <button type="button" class="status-badge-trigger badge ${badgeClass}" aria-label="Select status for ${v.vehicleNo}">
              <span class="status-dot"></span>
              <span class="status-text">${v.status}</span>
              <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="status-menu">
              ${menuItemsHtml}
            </div>
          </div>
        </td>
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

  const filtered = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date'], 'date');
  if (countFooter) {
    if (filtered.length === 0) {
      countFooter.textContent = `Showing 0 of ${state.fuelRecords.length} fuel records`;
    } else {
      countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${filtered.length} fuel records`;
    }
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <strong>No Data Found</strong>
            <span style="font-size: 12px;">No fuel records match the selected filter criteria</span>
          </div>
        </td>
      </tr>`;
    return;
  }

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

  const filtered = filterList(state.issues, ['issueId', 'vehicleNo', 'issue', 'severity', 'status'], 'reportedOn');
  if (countFooter) {
    if (filtered.length === 0) {
      countFooter.textContent = `Showing 0 of ${state.issues.length} issues`;
    } else {
      countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${filtered.length} issues`;
    }
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <strong>No Data Found</strong>
            <span style="font-size: 12px;">No issues match the selected filter criteria</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  const statusPriority = {
    'Open': 1,
    'In Progress': 2,
    'Closed': 3,
    'Resolved': 4
  };

  const severityPriority = {
    'High': 1,
    'Medium': 2,
    'Low': 3
  };

  const sorted = [...filtered].sort((a, b) => {
    const sA = statusPriority[a.status] || 99;
    const sB = statusPriority[b.status] || 99;
    if (sA !== sB) return sA - sB;

    const vA = severityPriority[a.severity] || 99;
    const vB = severityPriority[b.severity] || 99;
    return vA - vB;
  });

  tbody.innerHTML = sorted.slice(0, 5).map(i => {
    const sevClass = i.severity === 'High' ? 'badge-high' : i.severity === 'Medium' ? 'badge-medium' : 'badge-low';
    const statusClass = i.status === 'Open' ? 'badge-open' : i.status === 'In Progress' ? 'badge-in-progress' : i.status === 'Resolved' ? 'badge-resolved' : 'badge-closed';
    const statuses = [
      { key: 'Open', dotClass: 'dot-open' },
      { key: 'In Progress', dotClass: 'dot-in-progress' },
      { key: 'Resolved', dotClass: 'dot-resolved' },
      { key: 'Closed', dotClass: 'dot-closed' }
    ];

    const menuItemsHtml = statuses.map(s => `
      <div class="status-menu-item issue-status-menu-item ${i.status === s.key ? 'active' : ''}" data-value="${s.key}">
        <span class="dot ${s.dotClass}"></span>
        <span>${s.key}</span>
        ${i.status === s.key ? '<svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      </div>
    `).join('');

    return `
      <tr>
        <td><strong>${i.issueId}</strong></td>
        <td>${i.vehicleNo}</td>
        <td>${i.issue}</td>
        <td><span class="badge ${sevClass}">${i.severity}</span></td>
        <td>
          <div class="custom-status-dropdown" data-id="${i.issueId || i.id}">
            <button type="button" class="status-badge-trigger badge ${statusClass}" aria-label="Select status for issue ${i.issueId}">
              <span class="status-dot"></span>
              <span class="status-text">${i.status}</span>
              <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="status-menu">
              ${menuItemsHtml}
            </div>
          </div>
        </td>
        <td>${i.reportedOn}</td>
        <td style="text-align: right;">
          <div class="action-btns" style="justify-content: flex-end;">
            <button class="action-icon-btn resolve-issue" data-id="${i.id}" title="Quick Resolve Issue">
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

  const filtered = filterList(state.audits, ['user', 'action', 'entity', 'entityId', 'details'], 'dateTime');
  if (countFooter) {
    if (filtered.length === 0) {
      countFooter.textContent = `Showing 0 of ${state.audits.length} records`;
    } else {
      countFooter.textContent = `Showing 1 to ${Math.min(5, filtered.length)} of ${filtered.length} records`;
    }
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <strong>No Data Found</strong>
            <span style="font-size: 12px;">No audit records match the selected filter criteria</span>
          </div>
        </td>
      </tr>`;
    return;
  }

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
  const filteredVehicles = filterList(state.vehicles, ['vehicleNo', 'type', 'driver'], 'lastService');
  const filteredFuelRecords = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date'], 'date');

  // Compute fuel by vehicle type from filtered fuel records
  const typeTotals = { Compactor: 0, Tipper: 0, Tractor: 0, Loader: 0 };
  filteredFuelRecords.forEach(rec => {
    const v = filteredVehicles.find(item => item.vehicleNo === rec.vehicleNo || item.id === rec.vehicleNo);
    const vType = v ? v.type : (rec.fuelType || 'Compactor');
    if (typeTotals[vType] !== undefined) typeTotals[vType] += rec.liters;
    else typeTotals[vType] = rec.liters;
  });
  const sumTypeLiters = Object.values(typeTotals).reduce((a, b) => a + b, 0) || 1;
  const fuelByVehicleType = {
    labels: ["Compactor", "Tipper", "Tractor", "Loader"],
    values: ["Compactor", "Tipper", "Tractor", "Loader"].map(t => Math.round(typeTotals[t] || 0)),
    percentages: ["Compactor", "Tipper", "Tractor", "Loader"].map(t => Number(((typeTotals[t] / sumTypeLiters) * 100).toFixed(1))),
    colors: ["#3B82F6", "#A855F7", "#EAB308", "#22C55E"]
  };

  // Compute fuel type distribution from filtered fuel records
  const fuelTypeTotals = { Diesel: 0, CNG: 0 };
  filteredFuelRecords.forEach(rec => {
    const fType = rec.fuelType || 'Diesel';
    if (fuelTypeTotals[fType] !== undefined) fuelTypeTotals[fType] += rec.liters;
  });
  const sumFuelType = (fuelTypeTotals.Diesel + fuelTypeTotals.CNG) || 1;
  const fuelTypeDistribution = {
    labels: ["Diesel", "CNG"],
    values: [Math.round(fuelTypeTotals.Diesel), Math.round(fuelTypeTotals.CNG)],
    percentages: [
      Number(((fuelTypeTotals.Diesel / sumFuelType) * 100).toFixed(1)),
      Number(((fuelTypeTotals.CNG / sumFuelType) * 100).toFixed(1))
    ],
    colors: ["#2563EB", "#10B981"]
  };

  // Compute fuel trend (group fuel records by date)
  const dateMap = {};
  filteredFuelRecords.forEach(r => {
    dateMap[r.date] = (dateMap[r.date] || 0) + r.liters;
  });
  const trendLabels = Object.keys(dateMap).length > 0 ? Object.keys(dateMap).slice(-7) : local.chartData.fuelTrend.labels;
  const trendValues = Object.keys(dateMap).length > 0 ? trendLabels.map(l => Math.round(dateMap[l] || 0)) : local.chartData.fuelTrend.values;
  const fuelTrend = { labels: trendLabels, values: trendValues };

  const chartData = {
    fuelTrend: fuelTrend,
    fuelByVehicleType: fuelByVehicleType,
    fleetEfficiency: local.chartData.fleetEfficiency,
    fuelTypeDistribution: fuelTypeDistribution
  };

  const totalFuelL = Math.round(filteredFuelRecords.reduce((acc, r) => acc + (r.liters || 0), 0));
  const centerText = totalFuelL > 0 ? `${totalFuelL.toLocaleString()} L` : '0 L';

  renderLineChart('trendChartCanvas', chartData.fuelTrend);
  renderDonutChart('donutVehicleTypeCanvas', chartData.fuelByVehicleType, centerText);
  renderBarChart('barWardCanvas', chartData.fleetEfficiency);
  renderDonutChart('donutFuelTypeCanvas', chartData.fuelTypeDistribution, centerText);

  updateChartLegends(chartData);
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
    state.filters = { type: 'All', status: 'All', fuelType: 'All', search: '', startDate: null, endDate: null };
    document.getElementById('filterType').value = 'All';
    document.getElementById('filterStatus').value = 'All';
    document.getElementById('filterFuelType').value = 'All';
    document.getElementById('searchInput').value = '';
    document.getElementById('startDateInput').value = '2025-08-01';
    document.getElementById('endDateInput').value = '2025-08-27';
    const labelEl = document.getElementById('dateRangeLabel');
    if (labelEl) labelEl.textContent = '01 Aug 2025 - 27 Aug 2025';
    renderAll();
  });

  // Export Fleet Data CSV
  const exportBtnEl = document.getElementById('exportBtn');
  if (exportBtnEl) {
    exportBtnEl.onclick = function (e) {
      if (e) e.preventDefault();
      exportFleetData();
    };
  }

  // Date Range Filter Submission
  document.getElementById('datePickerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const startVal = document.getElementById('startDateInput').value;
    const endVal = document.getElementById('endDateInput').value;

    if (startVal && endVal) {
      if (new Date(startVal) > new Date(endVal)) {
        alert('Start date cannot be after end date.');
        return;
      }

      state.filters.startDate = startVal;
      state.filters.endDate = endVal;

      const formatDate = (str) => {
        const d = new Date(str);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      };
      const labelText = `${formatDate(startVal)} - ${formatDate(endVal)}`;
      const labelEl = document.getElementById('dateRangeLabel');
      if (labelEl) labelEl.textContent = labelText;

      renderAll();
      document.getElementById('datePickerModal')?.classList.remove('active');
    }
  });

  // Clear Date Filter button inside modal
  document.getElementById('clearDateBtn')?.addEventListener('click', () => {
    state.filters.startDate = null;
    state.filters.endDate = null;

    document.getElementById('startDateInput').value = '2025-08-01';
    document.getElementById('endDateInput').value = '2025-08-27';

    const labelEl = document.getElementById('dateRangeLabel');
    if (labelEl) labelEl.textContent = 'All Dates';

    renderAll();
    document.getElementById('datePickerModal')?.classList.remove('active');
  });

  window.addEventListener('resize', () => {
    renderCharts();
  });

  // Table actions delegation
  document.addEventListener('click', async (e) => {
    // 1. Status Dropdown Trigger Toggle
    const trigger = e.target.closest('.status-badge-trigger');
    if (trigger) {
      e.stopPropagation();
      const dropdown = trigger.closest('.custom-status-dropdown');
      const isOpen = dropdown.classList.contains('open');

      document.querySelectorAll('.custom-status-dropdown.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) {
        dropdown.classList.add('open');
      }
      return;
    }

    // 2. Select Option in Status Menu (Vehicle or Issue)
    const menuItem = e.target.closest('.status-menu-item');
    if (menuItem) {
      e.stopPropagation();
      const dropdown = menuItem.closest('.custom-status-dropdown');
      const id = dropdown.dataset.id;
      const newStatus = menuItem.dataset.value;

      dropdown.classList.remove('open');
      if (menuItem.classList.contains('issue-status-menu-item')) {
        await updateIssueStatus(id, newStatus);
      } else {
        await updateVehicleStatus(id, newStatus);
      }
      await loadData();
      renderAll();
      return;
    }

    // 3. Close open status dropdowns when clicking outside
    if (!e.target.closest('.custom-status-dropdown')) {
      document.querySelectorAll('.custom-status-dropdown.open').forEach(d => d.classList.remove('open'));
    }

    const target = e.target.closest('button');
    if (!target) return;

    if (target.id === 'exportBtn' || target.closest('#exportBtn')) {
      e.preventDefault();
      exportFleetData();
      return;
    }

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

export function exportFleetData() {
  try {
    const local = typeof getLocalState === 'function' ? getLocalState() : {};
    const vehicles = filterList(state.vehicles || local.vehicles || [], ['vehicleNo', 'type', 'driver'], 'lastService');
    const fuelRecords = filterList(state.fuelRecords || local.fuelRecords || [], ['vehicleNo', 'fuelType', 'date'], 'date');
    const auditRecords = filterList(state.audits || local.auditRecords || [], ['user', 'action', 'entity', 'entityId', 'details'], 'dateTime');

    const rows = [
      ["Category", "ID / Vehicle No", "Type / Date", "Status / Fuel Type", "Driver / Liters", "Amount / Mileage"],
      ...vehicles.map(v => ["Vehicle", v.vehicleNo || v.id || 'N/A', v.type || 'N/A', v.status || 'Active', v.driver || 'N/A', `${v.mileage || 0} km`]),
      ...fuelRecords.map(f => ["Fuel Record", f.id || 'N/A', f.date || 'N/A', f.fuelType || 'Diesel', `${f.liters || 0} L`, `Rs. ${f.amount || 0}`]),
      ...auditRecords.map(a => ["Audit Log", a.id || 'N/A', a.dateTime || 'N/A', a.user || 'Admin', a.action || 'Log', a.details || 'N/A'])
    ];

    const csvText = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const fileName = `WASTRAQ_Fleet_Export_${new Date().toISOString().slice(0, 10)}.csv`;

    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvText);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 300);

  } catch (err) {
    console.error("Export error:", err);
    alert("Export CSV failed: " + err.message);
  }
}

window.exportFleetData = exportFleetData;
