/**
 * WASTRAQ Fleet Management Application Logic
 * Integrates API Service, Custom Chart Canvas Renderer, and Interactive Modals.
 */

import { fetchKPIs, fetchVehicles, fetchFuelRecords, addVehicle, addFuelRecord, addVehicleIssue, deleteVehicle, updateVehicleStatus, deleteFuelRecord, resolveIssue, updateIssueStatus, getLocalState } from './api.js?v=10004';
import { renderLineChart, renderBarChart, renderDonutChart } from './charts.js?v=10004';
import { initModals, openDetailModal } from './modals.js?v=10004';

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
    severity: 'All',
    issueStatus: 'All',
    zone: 'All',
    mileage: 'All',
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
    },
    onRaiseIssue: async (iData) => {
      await addVehicleIssue(iData);
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

function updateVehicleTypeSelects() {
  const filterTypeSelect = document.getElementById('filterType');
  const addVehicleTypeSelect = document.getElementById('addVehicleTypeSelect');

  const defaultTypes = ["Compactor", "Tipper", "Tractor", "Loader", "Truck", "Earth Mover", "Electric Van"];
  const customTypes = [];

  state.vehicles.forEach(v => {
    if (v.type && !defaultTypes.includes(v.type) && !customTypes.includes(v.type) && v.type !== 'Other') {
      customTypes.push(v.type);
    }
  });

  if (filterTypeSelect) {
    const selectedFilter = state.filters.type;
    filterTypeSelect.innerHTML = `
      <option value="All">All Types</option>
      ${defaultTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
      ${customTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
    `;
    filterTypeSelect.value = selectedFilter;
  }

  if (addVehicleTypeSelect) {
    const currentAddTypeVal = addVehicleTypeSelect.value;
    addVehicleTypeSelect.innerHTML = `
      ${defaultTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
      ${customTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
      <option value="Other">Other (Custom Type...)</option>
    `;
    addVehicleTypeSelect.value = currentAddTypeVal || 'Compactor';
  }
}

export function getFuelUnit(fuelType) {
  const t = (fuelType || '').toLowerCase();
  if (t === 'cng') return 'kg';
  if (t === 'electric') return 'kWh';
  return 'L';
}

function updateQuantityUnitUI() {
  const fuelTypeSelect = document.getElementById('fuelModalFuelTypeSelect');
  const fuelQuantityLabel = document.getElementById('fuelQuantityLabel');
  const fuelQuantityInput = document.getElementById('fuelQuantityInput');
  if (!fuelTypeSelect) return;

  const fType = (fuelTypeSelect.value || 'Diesel').toLowerCase();
  if (fType === 'cng') {
    if (fuelQuantityLabel) fuelQuantityLabel.textContent = 'Gas Quantity (kg)';
    if (fuelQuantityInput) fuelQuantityInput.placeholder = 'e.g. 45.00';
  } else if (fType === 'electric') {
    if (fuelQuantityLabel) fuelQuantityLabel.textContent = 'Energy Consumed (kWh / Units)';
    if (fuelQuantityInput) fuelQuantityInput.placeholder = 'e.g. 60.00';
  } else {
    if (fuelQuantityLabel) fuelQuantityLabel.textContent = 'Fuel Quantity (Liters)';
    if (fuelQuantityInput) fuelQuantityInput.placeholder = 'e.g. 120.00';
  }
}

async function loadData() {
  state.kpis = await fetchKPIs();
  state.vehicles = await fetchVehicles();
  state.fuelRecords = await fetchFuelRecords();
  const local = getLocalState();
  state.issues = local.vehicleIssues;
  state.audits = local.auditRecords;

  updateVehicleTypeSelects();

  // Sync fuel modal vehicle select dropdown
  const vehicleSelect = document.getElementById('fuelModalVehicleSelect');
  const fuelTypeSelect = document.getElementById('fuelModalFuelTypeSelect');

  function updateAutoFuelType() {
    if (!vehicleSelect || !fuelTypeSelect) return;
    const selectedNo = vehicleSelect.value;
    const matchingV = state.vehicles.find(v => v.vehicleNo === selectedNo || v.id === selectedNo);
    if (matchingV && matchingV.fuelType) {
      fuelTypeSelect.value = matchingV.fuelType;
    }
    updateQuantityUnitUI();
  }

  if (vehicleSelect) {
    vehicleSelect.innerHTML = state.vehicles.map(v =>
      `<option value="${v.vehicleNo}">${v.vehicleNo} (${v.type})</option>`
    ).join('');

    vehicleSelect.removeEventListener('change', updateAutoFuelType);
    vehicleSelect.addEventListener('change', updateAutoFuelType);
    updateAutoFuelType();
  }

  if (fuelTypeSelect) {
    fuelTypeSelect.removeEventListener('change', updateQuantityUnitUI);
    fuelTypeSelect.addEventListener('change', updateQuantityUnitUI);
  }

  // Sync raise issue modal vehicle select dropdown
  const raiseVehicleSelect = document.getElementById('raiseIssueVehicleSelect');
  if (raiseVehicleSelect) {
    const maintVehicles = state.vehicles.filter(v => (v.status || '').toLowerCase() === 'maintenance' || (v.status || '').toLowerCase() === 'inactive');
    const otherVehicles = state.vehicles.filter(v => (v.status || '').toLowerCase() !== 'maintenance' && (v.status || '').toLowerCase() !== 'inactive');

    let optionsHtml = '';
    if (maintVehicles.length > 0) {
      optionsHtml += `<optgroup label="🛠️ Vehicles in Maintenance / Inactive">`;
      optionsHtml += maintVehicles.map(v => `<option value="${v.vehicleNo}">${v.vehicleNo} (${v.type} - ${v.status})</option>`).join('');
      optionsHtml += `</optgroup>`;
    }
    if (otherVehicles.length > 0) {
      optionsHtml += `<optgroup label="🚗 Other Vehicles">`;
      optionsHtml += otherVehicles.map(v => `<option value="${v.vehicleNo}">${v.vehicleNo} (${v.type} - ${v.status})</option>`).join('');
      optionsHtml += `</optgroup>`;
    }
    raiseVehicleSelect.innerHTML = optionsHtml;
  }
}

function renderAll() {
  updateVehicleTypeSelects();
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
  const { type, status, fuelType, severity, issueStatus, zone, mileage, search, startDate, endDate } = state.filters;

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

  return list.filter(item => {
    // Lookup parent vehicle if item is a child record (Fuel Record, Issue, or Audit Log)
    let parentVehicle = null;
    const vehNo = item.vehicleNo || (item.entity === 'Vehicle' ? item.entityId : null);
    if (vehNo) {
      parentVehicle = state.vehicles.find(v => v.vehicleNo === vehNo || v.id === vehNo);
    } else if (!item.vehicleNo && item.type && item.status && item.fuelType) {
      // Item is itself a vehicle object
      parentVehicle = item;
    }

    const resolvedType = item.type || (parentVehicle ? parentVehicle.type : null);
    const resolvedFuelType = item.fuelType || (parentVehicle ? parentVehicle.fuelType : null);
    const resolvedZone = item.zone || (parentVehicle ? parentVehicle.zone : null);
    const resolvedMileage = typeof item.mileage === 'number' ? item.mileage : (parentVehicle ? parentVehicle.mileage : null);

    // Resolved Status logic:
    // If it's an issue record (has issueId), item.status is issue status (Open/In Progress/etc). parentVehicle.status is vehicle status.
    let resolvedVehicleStatus = item.issueId ? (parentVehicle ? parentVehicle.status : null) : (item.status || (parentVehicle ? parentVehicle.status : null));

    // 1. Vehicle Type Filter
    if (type !== 'All') {
      if (resolvedType && resolvedType !== type) return false;
      if (!resolvedType && (item.vehicleNo || item.id)) return false;
    }

    // 2. Vehicle Status Filter
    if (status !== 'All') {
      if (resolvedVehicleStatus && resolvedVehicleStatus !== status) return false;
      if (!resolvedVehicleStatus && item.vehicleNo) return false;
    }

    // 3. Fuel Type Filter
    if (fuelType !== 'All') {
      if (resolvedFuelType && resolvedFuelType !== fuelType) return false;
      if (!resolvedFuelType && (item.vehicleNo || item.id)) return false;
    }

    // 4. Issue Severity Filter
    if (severity && severity !== 'All') {
      if (item.issueId) {
        if (item.severity !== severity) return false;
      }
    }

    // 5. Issue Status Filter
    if (issueStatus && issueStatus !== 'All') {
      if (item.issueId) {
        if (item.status !== issueStatus) return false;
      }
    }

    // 6. Zone / Depot Filter
    if (zone && zone !== 'All') {
      if (resolvedZone && resolvedZone !== zone) return false;
    }

    // 7. Mileage Range Filter
    if (mileage && mileage !== 'All') {
      if (typeof resolvedMileage === 'number') {
        if (mileage === 'low' && resolvedMileage >= 10000) return false;
        if (mileage === 'mid' && (resolvedMileage < 10000 || resolvedMileage > 50000)) return false;
        if (mileage === 'high' && resolvedMileage <= 50000) return false;
      }
    }

    // 8. Date Range Filter
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

    // 9. Search Query Filter
    if (search) {
      const s = search.toLowerCase().trim();
      let match = fields.some(f => item[f] && String(item[f]).toLowerCase().includes(s));

      if (!match && parentVehicle) {
        if (parentVehicle.vehicleNo && parentVehicle.vehicleNo.toLowerCase().includes(s)) match = true;
        if (parentVehicle.type && parentVehicle.type.toLowerCase().includes(s)) match = true;
        if (parentVehicle.driver && parentVehicle.driver.toLowerCase().includes(s)) match = true;
        if (parentVehicle.fuelType && parentVehicle.fuelType.toLowerCase().includes(s)) match = true;
      }

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

  tbody.innerHTML = filtered.slice(0, 5).map(f => {
    const unit = getFuelUnit(f.fuelType);
    return `
    <tr>
      <td>${f.date}</td>
      <td><strong>${f.vehicleNo}</strong></td>
      <td>${f.fuelType}</td>
      <td>${f.liters.toFixed(2)} ${unit}</td>
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
  `;
  }).join('');
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
  const filteredVehicles = filterList(state.vehicles, ['vehicleNo', 'type', 'driver'], 'lastService');
  const filteredFuelRecords = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date'], 'date');

  // 1. Compute Fuel by Vehicle Type dynamically
  const baseDefaults = ["Compactor", "Tipper", "Tractor", "Loader"];
  const typeTotals = { Compactor: 0, Tipper: 0, Tractor: 0, Loader: 0 };
  filteredFuelRecords.forEach(rec => {
    const v = filteredVehicles.find(item => item.vehicleNo === rec.vehicleNo || item.id === rec.vehicleNo);
    const vType = v ? v.type : (rec.fuelType || 'Compactor');
    if (typeTotals[vType] !== undefined) typeTotals[vType] += (rec.liters || 0);
    else typeTotals[vType] = (rec.liters || 0);
  });

  const chartKeys = Object.keys(typeTotals).filter(k => typeTotals[k] > 0 || baseDefaults.includes(k));
  const palette = ["#3B82F6", "#A855F7", "#EAB308", "#22C55E", "#EC4899", "#F97316", "#06B6D4", "#8B5CF6", "#64748B"];
  const sumTypeLiters = chartKeys.reduce((acc, k) => acc + (typeTotals[k] || 0), 0);

  const fuelByVehicleType = {
    labels: chartKeys,
    values: chartKeys.map(t => Math.round(typeTotals[t] || 0)),
    percentages: chartKeys.map(t => sumTypeLiters > 0 ? Number((((typeTotals[t] || 0) / sumTypeLiters) * 100).toFixed(1)) : 0),
    colors: chartKeys.map((_, i) => palette[i % palette.length])
  };

  const vehicleTypeCenterText = sumTypeLiters > 0 ? `${Math.round(sumTypeLiters).toLocaleString()} L` : '0 L';

  // 2. Compute Fuel Type Distribution dynamically
  const defaultFuelTypes = ["Diesel", "CNG", "Electric", "Petrol", "Hybrid"];
  const fuelTypeTotals = {};
  defaultFuelTypes.forEach(ft => fuelTypeTotals[ft] = 0);

  filteredFuelRecords.forEach(rec => {
    const fType = rec.fuelType || 'Diesel';
    if (fuelTypeTotals[fType] !== undefined) fuelTypeTotals[fType] += (rec.liters || 0);
    else fuelTypeTotals[fType] = (rec.liters || 0);
  });

  const activeFuelKeys = Object.keys(fuelTypeTotals).filter(k => fuelTypeTotals[k] > 0 || ["Diesel", "CNG"].includes(k));
  const sumFuelTypeLiters = activeFuelKeys.reduce((acc, k) => acc + (fuelTypeTotals[k] || 0), 0);

  const fuelPalette = {
    "Diesel": "#2563EB",
    "CNG": "#10B981",
    "Electric": "#F59E0B",
    "Petrol": "#EF4444",
    "Hybrid": "#8B5CF6"
  };

  const fuelTypeDistribution = {
    labels: activeFuelKeys,
    values: activeFuelKeys.map(k => Math.round(fuelTypeTotals[k] || 0)),
    percentages: activeFuelKeys.map(k => sumFuelTypeLiters > 0 ? Number((((fuelTypeTotals[k] || 0) / sumFuelTypeLiters) * 100).toFixed(1)) : 0),
    colors: activeFuelKeys.map((k, i) => fuelPalette[k] || palette[i % palette.length])
  };

  const fuelTypeCenterText = sumFuelTypeLiters > 0 ? `${Math.round(sumFuelTypeLiters).toLocaleString()} L` : '0 L';

  // 3. Compute Fleet Efficiency dynamically (km/L per vehicle type)
  const effTypes = ["Compactor", "Tipper", "Tractor", "Loader", "Truck"];
  const effValues = effTypes.map(t => {
    const vOfType = filteredVehicles.filter(v => v.type === t);
    const nos = vOfType.map(v => v.vehicleNo || v.id);
    const fOfType = filteredFuelRecords.filter(f => nos.includes(f.vehicleNo));

    const totalKm = vOfType.reduce((acc, v) => acc + (v.mileage || 0), 0);
    const totalLiters = fOfType.reduce((acc, f) => acc + (f.liters || 0), 0);

    if (totalKm > 0 && totalLiters > 0) {
      return Number((totalKm / totalLiters).toFixed(1));
    }
    return 0;
  });

  const fleetEfficiency = {
    labels: effTypes,
    values: effValues,
    color: "#22C55E"
  };

  // 4. Compute Fuel Trend dynamically from actual logged fuel records
  const dateMap = {};

  if (filteredFuelRecords && filteredFuelRecords.length > 0) {
    filteredFuelRecords.forEach(r => {
      if (!r.date) return;
      const dObj = parseDate(r.date);
      if (!dObj) return;

      const label = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (!dateMap[label]) {
        dateMap[label] = { liters: 0, amount: 0, dateObj: dObj };
      }
      dateMap[label].liters += (r.liters || 0);
      dateMap[label].amount += (r.amount || ((r.liters || 0) * 70));
    });
  }

  let sortedEntries = Object.entries(dateMap)
    .map(([label, item]) => ({ label, ...item }))
    .sort((a, b) => (a.dateObj ? a.dateObj.getTime() : 0) - (b.dateObj ? b.dateObj.getTime() : 0));

  // If no fuel records logged for active filters, generate zero-value date labels for the past 7 days
  if (sortedEntries.length === 0) {
    const today = new Date();
    sortedEntries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      sortedEntries.push({ label, liters: 0, amount: 0, dateObj: d });
    }
  }

  const recentEntries = sortedEntries.slice(-7);
  const trendLabels = recentEntries.map(e => e.label);
  const trendLiters = recentEntries.map(e => Math.round(e.liters));
  const trendAmounts = recentEntries.map(e => Math.round(e.amount));

  const chartData = {
    fuelByVehicleType: fuelByVehicleType,
    fleetEfficiency: fleetEfficiency,
    fuelTypeDistribution: fuelTypeDistribution
  };

  const mode = state.trendMode || 'consumption';
  const trendTitleEl = document.getElementById('trendChartTitle');
  if (trendTitleEl) {
    trendTitleEl.textContent = mode === 'cost' ? 'Fuel Cost Trend (₹)' : 'Fuel Consumption Trend (L)';
  }

  if (mode === 'cost') {
    renderLineChart('trendChartCanvas', { labels: trendLabels, values: trendAmounts }, { isCurrency: true });
  } else {
    renderLineChart('trendChartCanvas', { labels: trendLabels, values: trendLiters }, { isCurrency: false, unitSuffix: ' L' });
  }

  renderDonutChart('donutVehicleTypeCanvas', chartData.fuelByVehicleType, vehicleTypeCenterText);
  renderBarChart('barWardCanvas', chartData.fleetEfficiency);
  renderDonutChart('donutFuelTypeCanvas', chartData.fuelTypeDistribution, fuelTypeCenterText);

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
    legendFuel.innerHTML = d.labels.map((lbl, i) => {
      const unit = getFuelUnit(lbl);
      return `
        <div class="legend-item">
          <span class="legend-color-dot" style="background:${d.colors[i]};"></span>
          ${lbl} ${d.values[i].toLocaleString()} ${unit} (${d.percentages[i]}%)
        </div>
      `;
    }).join('');
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
  document.getElementById('toggleConsumptionBtn')?.addEventListener('click', () => {
    state.trendMode = 'consumption';
    document.getElementById('toggleConsumptionBtn')?.classList.add('active');
    document.getElementById('toggleCostBtn')?.classList.remove('active');
    renderCharts();
  });

  document.getElementById('toggleCostBtn')?.addEventListener('click', () => {
    state.trendMode = 'cost';
    document.getElementById('toggleCostBtn')?.classList.add('active');
    document.getElementById('toggleConsumptionBtn')?.classList.remove('active');
    renderCharts();
  });

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

  document.getElementById('filterSeverity')?.addEventListener('change', (e) => {
    state.filters.severity = e.target.value;
    renderAll();
  });

  document.getElementById('filterIssueStatus')?.addEventListener('change', (e) => {
    state.filters.issueStatus = e.target.value;
    renderAll();
  });

  document.getElementById('filterZone')?.addEventListener('change', (e) => {
    state.filters.zone = e.target.value;
    renderAll();
  });

  document.getElementById('filterMileage')?.addEventListener('change', (e) => {
    state.filters.mileage = e.target.value;
    renderAll();
  });

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderAll();
  });

  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    state.filters = {
      type: 'All',
      status: 'All',
      fuelType: 'All',
      severity: 'All',
      issueStatus: 'All',
      zone: 'All',
      mileage: 'All',
      search: '',
      startDate: null,
      endDate: null
    };

    if (document.getElementById('filterType')) document.getElementById('filterType').value = 'All';
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = 'All';
    if (document.getElementById('filterFuelType')) document.getElementById('filterFuelType').value = 'All';
    if (document.getElementById('filterSeverity')) document.getElementById('filterSeverity').value = 'All';
    if (document.getElementById('filterIssueStatus')) document.getElementById('filterIssueStatus').value = 'All';
    if (document.getElementById('filterZone')) document.getElementById('filterZone').value = 'All';
    if (document.getElementById('filterMileage')) document.getElementById('filterMileage').value = 'All';
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    if (document.getElementById('startDateInput')) document.getElementById('startDateInput').value = '2025-08-01';
    if (document.getElementById('endDateInput')) document.getElementById('endDateInput').value = '2025-08-27';

    const labelEl = document.getElementById('dateRangeLabel');
    if (labelEl) labelEl.textContent = 'All Dates';

    renderAll();
  });

  // Preset Date Buttons
  document.querySelectorAll('.preset-date-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const range = e.currentTarget.dataset.range;
      let startStr = '2025-08-01';
      let endStr = '2025-08-27';

      if (range === 'today') {
        startStr = '2025-08-27';
        endStr = '2025-08-27';
      } else if (range === '7days') {
        startStr = '2025-08-20';
        endStr = '2025-08-27';
      } else if (range === 'month') {
        startStr = '2025-08-01';
        endStr = '2025-08-31';
      } else if (range === 'ytd') {
        startStr = '2025-01-01';
        endStr = '2025-08-27';
      }

      if (document.getElementById('startDateInput')) document.getElementById('startDateInput').value = startStr;
      if (document.getElementById('endDateInput')) document.getElementById('endDateInput').value = endStr;
    });
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

  // View All buttons trigger popup window modal showing entire list
  document.querySelectorAll('.view-all-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (tab) openFullListModal(tab);
    });
  });

  // Sidebar Nav Tabs
  document.querySelectorAll('.nav-item').forEach(link => {
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

function openFullListModal(tab) {
  if (tab === 'vehicles') {
    const filtered = filterList(state.vehicles, ['vehicleNo', 'type', 'driver'], 'lastService');
    const tableRows = filtered.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No vehicles match current filter criteria</td></tr>`
      : filtered.map(v => {
          const badgeClass = v.status === 'Active' ? 'badge-active' : v.status === 'Inactive' ? 'badge-inactive' : v.status === 'Maintenance' ? 'badge-maintenance' : 'badge-out-of-service';
          return `
            <tr>
              <td><strong>${v.vehicleNo}</strong></td>
              <td>${v.type}</td>
              <td><span class="badge ${badgeClass}">${v.status}</span></td>
              <td>${v.fuelType}</td>
              <td>${v.driver}</td>
              <td>${v.lastService}</td>
              <td>${(v.mileage || 0).toLocaleString()} km</td>
            </tr>
          `;
        }).join('');

    const contentHtml = `
      <div class="popup-summary-bar">
        <span>Showing all ${filtered.length} of ${state.vehicles.length} vehicles</span>
        <span>Filtered List View</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Vehicle No.</th>
              <th>Type</th>
              <th>Status</th>
              <th>Fuel Type</th>
              <th>Driver</th>
              <th>Last Service</th>
              <th>Odometer</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
    openDetailModal('All Vehicles List', contentHtml, true);
    return;
  }

  if (tab === 'fuel') {
    const filtered = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date'], 'date');
    const totalLiters = filtered.reduce((acc, f) => acc + (f.liters || 0), 0);
    const totalSpend = filtered.reduce((acc, f) => acc + (f.amount || 0), 0);

    const tableRows = filtered.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">No fuel records match current filter criteria</td></tr>`
      : filtered.map(f => {
          const unit = getFuelUnit(f.fuelType);
          return `
            <tr>
              <td>${f.date}</td>
              <td><strong>${f.vehicleNo}</strong></td>
              <td>${f.fuelType}</td>
              <td>${f.liters.toFixed(2)} ${unit}</td>
              <td>₹${f.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('');

    const contentHtml = `
      <div class="popup-summary-bar">
        <span>Showing all ${filtered.length} of ${state.fuelRecords.length} fuel logs</span>
        <span>Total Fuel: ${Math.round(totalLiters).toLocaleString()} L | Spend: ₹${Math.round(totalSpend).toLocaleString('en-IN')}</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle No.</th>
              <th>Fuel Type</th>
              <th>Quantity</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
    openDetailModal('All Fuel Records', contentHtml, true);
    return;
  }

  if (tab === 'issues') {
    const filtered = filterList(state.issues, ['issueId', 'vehicleNo', 'issue', 'severity', 'status'], 'reportedOn');
    const tableRows = filtered.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">No maintenance issues match current filter criteria</td></tr>`
      : filtered.map(i => {
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
            </tr>
          `;
        }).join('');

    const contentHtml = `
      <div class="popup-summary-bar">
        <span>Showing all ${filtered.length} of ${state.issues.length} maintenance issues</span>
        <span>Filtered List View</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Issue ID</th>
              <th>Vehicle No.</th>
              <th>Issue Description</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Reported On</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
    openDetailModal('All Vehicle Issues', contentHtml, true);
    return;
  }

  if (tab === 'audits') {
    const filtered = filterList(state.audits, ['user', 'action', 'entity', 'entityId', 'details'], 'dateTime');
    const tableRows = filtered.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">No audit records found</td></tr>`
      : filtered.map(a => `
          <tr>
            <td>${a.dateTime}</td>
            <td><strong>${a.user}</strong></td>
            <td>${a.action}</td>
            <td>${a.entity}</td>
            <td>${a.entityId}</td>
            <td class="cell-truncate" title="${a.details}">${a.details}</td>
          </tr>
        `).join('');

    const contentHtml = `
      <div class="popup-summary-bar">
        <span>Showing all ${filtered.length} of ${state.audits.length} audit logs</span>
        <span>System Log History</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
    openDetailModal('All System Audit Logs', contentHtml, true);
    return;
  }

  if (tab === 'analysis') {
    const filteredVehicles = filterList(state.vehicles, ['vehicleNo', 'type', 'driver'], 'lastService');
    const filteredFuelRecords = filterList(state.fuelRecords, ['vehicleNo', 'fuelType', 'date'], 'date');

    const typeTotals = {};
    const typeKm = {};
    const typeCount = {};

    filteredVehicles.forEach(v => {
      const t = v.type || 'Compactor';
      typeCount[t] = (typeCount[t] || 0) + 1;
      typeKm[t] = (typeKm[t] || 0) + (v.mileage || 0);
    });

    filteredFuelRecords.forEach(f => {
      const v = filteredVehicles.find(item => item.vehicleNo === f.vehicleNo || item.id === f.vehicleNo);
      const t = v ? v.type : (f.fuelType || 'Compactor');
      typeTotals[t] = (typeTotals[t] || 0) + (f.liters || 0);
    });

    const allTypes = Array.from(new Set([...Object.keys(typeCount), ...Object.keys(typeTotals), "Compactor", "Tipper", "Tractor", "Loader", "Truck"]));
    const totalLiters = Object.values(typeTotals).reduce((a, b) => a + b, 0);

    const rows = allTypes.map(t => {
      const vCount = typeCount[t] || 0;
      const liters = typeTotals[t] || 0;
      const kms = typeKm[t] || 0;
      const eff = (liters > 0 && kms > 0) ? (kms / liters).toFixed(1) : '0.0';
      const pct = totalLiters > 0 ? ((liters / totalLiters) * 100).toFixed(1) : '0.0';

      return `
        <tr>
          <td><strong>${t}</strong></td>
          <td>${vCount}</td>
          <td>${Math.round(liters).toLocaleString()} L</td>
          <td>${eff} km/L</td>
          <td>${pct}%</td>
        </tr>
      `;
    }).join('');

    const contentHtml = `
      <div class="popup-summary-bar">
        <span>Fleet Analytics & Fuel Breakdown</span>
        <span>Total Fleet Fuel: ${Math.round(totalLiters).toLocaleString()} L</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Vehicle Category</th>
              <th>Vehicles Count</th>
              <th>Fuel Consumed (L)</th>
              <th>Avg Efficiency</th>
              <th>Fuel Share</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
    openDetailModal('Fleet Analytics & Consumption Breakdown', contentHtml, true);
    return;
  }
}

export function exportFleetData() {
  try {
    const local = typeof getLocalState === 'function' ? getLocalState() : {};
    const vehicles = filterList(state.vehicles || local.vehicles || [], ['vehicleNo', 'type', 'driver'], 'lastService');
    const fuelRecords = filterList(state.fuelRecords || local.fuelRecords || [], ['vehicleNo', 'fuelType', 'date'], 'date');
    const issues = filterList(state.issues || local.vehicleIssues || [], ['issueId', 'vehicleNo', 'issue', 'severity', 'status'], 'reportedOn');
    const auditRecords = filterList(state.audits || local.auditRecords || [], ['user', 'action', 'entity', 'entityId', 'details'], 'dateTime');

    // Build filter summary line
    const activeFilterSummaries = [];
    if (state.filters.type !== 'All') activeFilterSummaries.push(`Vehicle Type: ${state.filters.type}`);
    if (state.filters.status !== 'All') activeFilterSummaries.push(`Vehicle Status: ${state.filters.status}`);
    if (state.filters.fuelType !== 'All') activeFilterSummaries.push(`Fuel Type: ${state.filters.fuelType}`);
    if (state.filters.severity !== 'All') activeFilterSummaries.push(`Severity: ${state.filters.severity}`);
    if (state.filters.issueStatus !== 'All') activeFilterSummaries.push(`Issue Status: ${state.filters.issueStatus}`);
    if (state.filters.zone !== 'All') activeFilterSummaries.push(`Zone: ${state.filters.zone}`);
    if (state.filters.mileage !== 'All') activeFilterSummaries.push(`Mileage: ${state.filters.mileage}`);
    if (state.filters.startDate && state.filters.endDate) activeFilterSummaries.push(`Date Range: ${state.filters.startDate} to ${state.filters.endDate}`);
    if (state.filters.search) activeFilterSummaries.push(`Search Query: "${state.filters.search}"`);

    const filterString = activeFilterSummaries.length > 0 ? activeFilterSummaries.join(' | ') : 'All Filters Default (No Active Filter)';

    const rows = [
      ["=== WASTRAQ FLEET & FUEL MANAGEMENT FILTERED EXPORT ==="],
      ["Export Date", new Date().toLocaleString()],
      ["Applied Filters", filterString],
      [],
      ["--- VEHICLES (" + vehicles.length + " matching) ---"],
      ["Vehicle Registration No", "Vehicle Type", "Status", "Fuel Type", "Assigned Driver", "Odometer Mileage", "Last Service Date"]
    ];

    if (vehicles.length > 0) {
      vehicles.forEach(v => {
        rows.push([
          v.vehicleNo || v.id || 'N/A',
          v.type || 'N/A',
          v.status || 'Active',
          v.fuelType || 'Diesel',
          v.driver || 'Unassigned',
          v.mileage !== undefined ? `${v.mileage} km` : 'N/A',
          v.lastService || 'N/A'
        ]);
      });
    } else {
      rows.push(["No vehicle records match the active filters."]);
    }

    rows.push([]);
    rows.push(["--- FUEL RECORDS (" + fuelRecords.length + " matching) ---"]);
    rows.push(["Log ID", "Date", "Vehicle Registration No", "Fuel Type", "Quantity", "Total Amount (Rs.)"]);

    if (fuelRecords.length > 0) {
      fuelRecords.forEach(f => {
        const unit = typeof getFuelUnit === 'function' ? getFuelUnit(f.fuelType) : 'L';
        rows.push([
          f.id || 'N/A',
          f.date || 'N/A',
          f.vehicleNo || 'N/A',
          f.fuelType || 'Diesel',
          `${f.liters || 0} ${unit}`,
          `Rs. ${f.amount || 0}`
        ]);
      });
    } else {
      rows.push(["No fuel records match the active filters."]);
    }

    rows.push([]);
    rows.push(["--- VEHICLE ISSUES (" + issues.length + " matching) ---"]);
    rows.push(["Issue ID", "Vehicle Registration No", "Issue Summary", "Severity", "Status", "Reported On Date"]);

    if (issues.length > 0) {
      issues.forEach(i => {
        rows.push([
          i.issueId || i.id || 'N/A',
          i.vehicleNo || 'N/A',
          i.issue || 'N/A',
          i.severity || 'Medium',
          i.status || 'Open',
          i.reportedOn || 'N/A'
        ]);
      });
    } else {
      rows.push(["No vehicle issues match the active filters."]);
    }

    rows.push([]);
    rows.push(["--- AUDIT LOGS (" + auditRecords.length + " matching) ---"]);
    rows.push(["Audit ID", "Date & Time", "User", "Action", "Entity", "Entity ID", "Details"]);

    if (auditRecords.length > 0) {
      auditRecords.forEach(a => {
        rows.push([
          a.id || 'N/A',
          a.dateTime || 'N/A',
          a.user || 'Admin',
          a.action || 'Log',
          a.entity || 'N/A',
          a.entityId || 'N/A',
          a.details || 'N/A'
        ]);
      });
    } else {
      rows.push(["No audit logs match the active filters."]);
    }

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
