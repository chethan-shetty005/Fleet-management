/**
 * WASTRAQ Fleet Management API Service Layer
 * Connects directly to FastAPI Backend at http://localhost:8000/api/v1
 */

import {
  INITIAL_KPIS,
  INITIAL_VEHICLES,
  INITIAL_FUEL_RECORDS,
  INITIAL_VEHICLE_ISSUES,
  INITIAL_AUDIT_RECORDS,
  CHART_DATA
} from './mockData.js';

export const API_BASE_URL = 'http://localhost:8000/api/v1';

const STORAGE_KEY = 'wastraq_fleet_state_v1';

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading stored state:', err);
  }
  return null;
}

let localState = loadStoredState() || {
  kpis: { ...INITIAL_KPIS },
  vehicles: [],
  fuelRecords: [],
  vehicleIssues: [],
  auditRecords: [],
  chartData: { ...CHART_DATA }
};

export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  localState = {
    kpis: { ...INITIAL_KPIS },
    vehicles: [],
    fuelRecords: [],
    vehicleIssues: [],
    auditRecords: [],
    chartData: { ...CHART_DATA }
  };
}

export function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

/**
 * Toast Notification System to display API failures & success to the user
 */
export function showToast(message, type = 'error') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'error' 
        ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
      }
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

/**
 * Centralized API response handler. Throws Error on non-ok HTTP responses with detail string.
 */
async function handleResponse(res, contextMessage = 'API request failed') {
  if (!res.ok) {
    let errorDetail = `${contextMessage} (${res.status} ${res.statusText})`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        if (typeof data.detail === 'string') {
          errorDetail = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorDetail = data.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        } else {
          errorDetail = JSON.stringify(data.detail);
        }
      }
    } catch (e) {}
    throw new Error(errorDetail);
  }
  if (res.status === 204) return null;
  return await res.json();
}

/**
 * GET /analytics/overview
 */
export async function fetchKPIs() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/overview`);
    const data = await handleResponse(res, 'Failed to fetch KPIs');
    
    localState.kpis = {
      ...localState.kpis,
      totalVehicles: data.total_vehicles || 0,
      activeVehicles: data.active_vehicles || 0,
      inactiveVehicles: (data.maintenance_vehicles || 0) + (data.out_of_service_vehicles || 0),
      fuelConsumedLiters: Math.round(data.total_fuel_consumed_liters || 0),
      fuelSpendRupees: Math.round(data.total_maintenance_cost || 0)
    };
    saveLocalState();
    return localState.kpis;
  } catch (err) {
    showToast(`API Error (KPIs): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * GET /vehicles
 */
export async function fetchVehicles() {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles`);
    const data = await handleResponse(res, 'Failed to fetch vehicles');
    
    if (Array.isArray(data)) {
      localState.vehicles = data.map(v => ({
        id: v.vehicle_code || v.v_id || v.id,
        vehicle_code: v.vehicle_code || v.v_id,
        vehicleNo: v.vehicleNo || v.license_plate || v.v_id,
        brand: v.brand || v.make || 'Tata',
        type: v.vehicleType || v.vehicle_type || v.model || 'Refuse Compactor Vehicle',
        vehicleType: v.vehicleType || v.vehicle_type || 'Refuse Compactor Vehicle',
        fuelType: v.fuelType || v.fuel_type || 'Diesel',
        serviceDueFreq: v.serviceDueFreq || v.service_due_freq || 30,
        serviceDueKm: v.serviceDueKm || v.service_due_km || 5000,
        ward: v.ward || 1,
        status: v.status || 'Active',
        lastService: v.updated_at ? new Date(v.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
        driver: 'Assigned Driver',
        mileage: Number(v.current_mileage || 0)
      }));
      saveLocalState();
      recalculateChartData();
    }
    return localState.vehicles;
  } catch (err) {
    showToast(`API Error (Vehicles): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * POST /vehicles
 */
export async function addVehicle(vehicleData) {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_code: vehicleData.vehicle_code || vehicleData.vehicleNo,
        v_id: vehicleData.vehicle_code || vehicleData.vehicleNo,
        vehicleNo: vehicleData.vehicleNo,
        license_plate: vehicleData.vehicleNo,
        brand: vehicleData.brand || 'Tata',
        make: vehicleData.brand || 'Tata',
        vehicleType: vehicleData.vehicleType || vehicleData.type,
        vehicle_type: vehicleData.vehicleType || vehicleData.type,
        fuelType: vehicleData.fuelType,
        fuel_type: vehicleData.fuelType,
        serviceDueFreq: Number(vehicleData.serviceDueFreq || 30),
        serviceDueKm: Number(vehicleData.serviceDueKm || 5000),
        ward: Number(vehicleData.ward || 1),
        status: vehicleData.status || 'Active',
        current_mileage: Number(vehicleData.mileage || 0)
      })
    });
    const saved = await handleResponse(res, 'Failed to add vehicle');
    showToast(`Vehicle '${saved.vehicleNo || saved.license_plate}' created successfully!`, 'success');

    const newV = {
      id: saved.vehicle_code || saved.v_id || saved.id,
      vehicle_code: saved.vehicle_code || saved.v_id,
      vehicleNo: saved.vehicleNo || saved.license_plate || saved.v_id,
      brand: saved.brand || saved.make || 'Tata',
      type: saved.vehicleType || saved.vehicle_type || vehicleData.type,
      vehicleType: saved.vehicleType || saved.vehicle_type || vehicleData.type,
      fuelType: saved.fuelType || saved.fuel_type || vehicleData.fuelType || 'Diesel',
      serviceDueFreq: saved.serviceDueFreq || saved.service_due_freq || 30,
      serviceDueKm: saved.serviceDueKm || saved.service_due_km || 5000,
      ward: saved.ward || 1,
      status: saved.status || 'Active',
      lastService: 'Just now',
      driver: vehicleData.driver || 'Admin Assigned',
      mileage: Number(saved.current_mileage || 0)
    };

    localState.vehicles.unshift(newV);

    localState.auditRecords.unshift({
      id: `AUD-${Date.now()}`,
      dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      user: 'Admin User',
      action: 'Vehicle Added',
      entity: 'Vehicle',
      entityId: newV.vehicleNo,
      details: `Added new ${newV.type} vehicle (${newV.vehicle_code})`
    });

    saveLocalState();
    recalculateChartData();
    return newV;
  } catch (err) {
    showToast(`API Error (Add Vehicle): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * PUT /vehicles/{id}
 */
export async function updateVehicleStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const updated = await handleResponse(res, 'Failed to update vehicle status');
    showToast(`Vehicle ${id} status updated to '${newStatus}'`, 'success');

    const v = localState.vehicles.find(item => item.id === id || item.vehicleNo === id);
    if (v) {
      const oldStatus = v.status;
      v.status = updated.status || newStatus;
      localState.auditRecords.unshift({
        id: `AUD-${Date.now()}`,
        dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        user: 'Admin User',
        action: 'Vehicle Updated',
        entity: 'Vehicle',
        entityId: v.vehicleNo || v.id,
        details: `Updated status from ${oldStatus} to ${newStatus}`
      });
      saveLocalState();
    }
    return updated;
  } catch (err) {
    showToast(`API Error (Update Status): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * DELETE /vehicles/{id}
 */
export async function deleteVehicle(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
      method: 'DELETE'
    });
    await handleResponse(res, 'Failed to delete vehicle');
    showToast(`Vehicle ${id} deleted from backend`, 'success');

    localState.vehicles = localState.vehicles.filter(v => v.id !== id && v.vehicleNo !== id);
    recalculateChartData();
    saveLocalState();
    return true;
  } catch (err) {
    showToast(`API Error (Delete Vehicle): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * GET /fuel
 */
export async function fetchFuelRecords() {
  try {
    const res = await fetch(`${API_BASE_URL}/fuel`);
    const data = await handleResponse(res, 'Failed to fetch fuel records');
    
    if (Array.isArray(data)) {
      localState.fuelRecords = data.map(f => ({
        id: f.id || f.record_id,
        date: f.date,
        vehicleNo: f.vehicleNo,
        fuelType: f.fuelType || 'Diesel',
        liters: Number(f.liters || 0),
        amount: Number(f.amount || 0)
      }));
      saveLocalState();
      recalculateChartData();
    }
    return localState.fuelRecords;
  } catch (err) {
    showToast(`API Error (Fuel Records): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * POST /fuel
 */
export async function addFuelRecord(record) {
  const newRecord = {
    id: `FR-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    date: record.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    vehicleNo: record.vehicleNo,
    fuelType: record.fuelType || 'Diesel',
    liters: Number(record.liters),
    amount: Number(record.amount)
  };

  try {
    const res = await fetch(`${API_BASE_URL}/fuel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newRecord.id,
        date: newRecord.date,
        vehicleNo: newRecord.vehicleNo,
        fuelType: newRecord.fuelType,
        liters: newRecord.liters,
        amount: newRecord.amount
      })
    });
    const saved = await handleResponse(res, 'Failed to save fuel record');
    showToast(`Fuel record logged for vehicle ${newRecord.vehicleNo}!`, 'success');
    if (saved && saved.id) newRecord.id = saved.id;

    localState.fuelRecords.unshift(newRecord);
    localState.auditRecords.unshift({
      id: `AUD-${Date.now()}`,
      dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      user: 'Admin User',
      action: 'Fuel Added',
      entity: 'Fuel Record',
      entityId: newRecord.id,
      details: `Added ${newRecord.liters.toFixed(2)} L for ${newRecord.vehicleNo}`
    });

    saveLocalState();
    recalculateChartData();
    return newRecord;
  } catch (err) {
    showToast(`API Error (Add Fuel Record): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * DELETE /fuel/{id}
 */
export async function deleteFuelRecord(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/fuel/${id}`, { method: 'DELETE' });
    await handleResponse(res, 'Failed to delete fuel record');
    showToast(`Fuel record deleted`, 'success');

    localState.fuelRecords = localState.fuelRecords.filter(f => f.id !== id);
    recalculateChartData();
    saveLocalState();
    return true;
  } catch (err) {
    showToast(`API Error (Delete Fuel Record): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * GET /maintenance
 */
export async function fetchVehicleIssues() {
  try {
    const res = await fetch(`${API_BASE_URL}/maintenance`);
    const data = await handleResponse(res, 'Failed to fetch maintenance logs');
    if (Array.isArray(data)) {
      localState.vehicleIssues = data.map(m => ({
        id: m.log_id || String(m.id),
        issueId: m.log_id || `MNT-${m.id}`,
        vehicleNo: m.v_id,
        issue: m.description || m.service_type || 'Maintenance Service',
        severity: 'Medium',
        status: m.status || 'In Progress',
        reportedOn: m.service_date ? String(m.service_date) : new Date().toLocaleDateString('en-GB')
      }));
      saveLocalState();
    }
    return localState.vehicleIssues;
  } catch (err) {
    showToast(`API Error (Maintenance Logs): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * POST /maintenance
 */
export async function addVehicleIssue(issueData) {
  const newIssue = {
    id: `ISS-${Date.now()}`,
    issueId: `ISS-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleNo: issueData.vehicleNo,
    issue: issueData.issue,
    severity: issueData.severity || 'Medium',
    status: issueData.status || 'In Progress',
    reportedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  try {
    const res = await fetch(`${API_BASE_URL}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: newIssue.issueId,
        v_id: newIssue.vehicleNo,
        service_type: (newIssue.issue || 'Service Issue').substring(0, 50),
        description: newIssue.issue,
        cost: 0.0,
        status: newIssue.status
      })
    });
    const saved = await handleResponse(res, 'Failed to raise vehicle issue');
    showToast(`Vehicle issue ${newIssue.issueId} submitted!`, 'success');

    localState.vehicleIssues.unshift(newIssue);

    if (newIssue.vehicleNo) {
      await updateVehicleStatus(newIssue.vehicleNo, 'Maintenance');
    }

    localState.auditRecords.unshift({
      id: `AUD-${Date.now()}`,
      dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      user: 'Admin User',
      action: 'Issue Raised',
      entity: 'Vehicle Issue',
      entityId: newIssue.issueId,
      details: `Raised ${newIssue.severity} severity issue for ${newIssue.vehicleNo}: ${newIssue.issue}`
    });

    saveLocalState();
    recalculateChartData();
    return newIssue;
  } catch (err) {
    showToast(`API Error (Raise Issue): ${err.message}`, 'error');
    throw err;
  }
}

/**
 * PUT /maintenance/{issueId}
 */
export async function updateIssueStatus(issueId, newStatus) {
  try {
    const res = await fetch(`${API_BASE_URL}/maintenance/${issueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const updated = await handleResponse(res, 'Failed to update issue status');
    showToast(`Issue ${issueId} updated to '${newStatus}'`, 'success');

    const issue = localState.vehicleIssues.find(i => i.issueId === issueId || i.id === issueId);
    if (issue) {
      const oldStatus = issue.status;
      issue.status = updated.status || newStatus;

      if ((newStatus === 'Completed' || newStatus === 'Resolved' || newStatus === 'Closed') && issue.vehicleNo) {
        await updateVehicleStatus(issue.vehicleNo, 'Active');
      }

      localState.auditRecords.unshift({
        id: `AUD-${Date.now()}`,
        dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        user: 'Admin User',
        action: 'Issue Status Updated',
        entity: 'Vehicle Issue',
        entityId: issue.issueId,
        details: `Updated status for ${issue.issueId} (${issue.vehicleNo}) from ${oldStatus} to ${newStatus}`
      });
      saveLocalState();
    }
    return issue;
  } catch (err) {
    showToast(`API Error (Update Issue): ${err.message}`, 'error');
    throw err;
  }
}

export async function resolveIssue(issueId) {
  return await updateIssueStatus(issueId, 'Completed');
}

export function recalculateChartData() {
  const vehicles = localState.vehicles || [];
  const fuelRecords = localState.fuelRecords || [];

  const allowedTypes = ["Pushcart", "EV Auto", "Tata Ace", "Tractor", "Refuse Compactor Vehicle"];
  const allowedFuels = ["Petrol", "Diesel", "Electric Charge"];

  // 1. Fuel by Vehicle Type
  const typeTotals = {};
  allowedTypes.forEach(t => typeTotals[t] = 0);

  fuelRecords.forEach(rec => {
    const v = vehicles.find(item => item.vehicleNo === rec.vehicleNo || item.id === rec.vehicleNo || item.vehicle_code === rec.vehicleNo);
    const vType = v ? (v.vehicleType || v.type) : (rec.vehicleType || 'Refuse Compactor Vehicle');
    if (typeTotals[vType] !== undefined) {
      typeTotals[vType] += rec.liters;
    } else {
      typeTotals[vType] = rec.liters;
    }
  });

  const sumTypeLiters = Object.values(typeTotals).reduce((a, b) => a + b, 0);

  localState.chartData.fuelByVehicleType = {
    labels: allowedTypes,
    values: allowedTypes.map(t => Math.round(typeTotals[t] || 0)),
    percentages: allowedTypes.map(t => sumTypeLiters > 0 ? Number((((typeTotals[t] || 0) / sumTypeLiters) * 100).toFixed(1)) : 0),
    colors: ["#3B82F6", "#A855F7", "#EAB308", "#22C55E", "#EC4899"]
  };

  // 2. Fuel Type Distribution
  const fuelTypeTotals = {};
  allowedFuels.forEach(f => fuelTypeTotals[f] = 0);

  fuelRecords.forEach(rec => {
    const fType = rec.fuelType || 'Diesel';
    if (fuelTypeTotals[fType] !== undefined) {
      fuelTypeTotals[fType] += rec.liters;
    } else {
      fuelTypeTotals[fType] = rec.liters;
    }
  });

  const sumFuelType = Object.values(fuelTypeTotals).reduce((a, b) => a + b, 0);

  localState.chartData.fuelTypeDistribution = {
    labels: allowedFuels,
    values: allowedFuels.map(f => Math.round(fuelTypeTotals[f] || 0)),
    percentages: allowedFuels.map(f => sumFuelType > 0 ? Number((((fuelTypeTotals[f] || 0) / sumFuelType) * 100).toFixed(1)) : 0),
    colors: ["#2563EB", "#10B981", "#F59E0B"]
  };

  // 3. Fleet Efficiency (km/L per vehicle type)
  const typeCounts = {};
  allowedTypes.forEach(t => typeCounts[t] = 0);
  vehicles.forEach(v => {
    const t = v.vehicleType || v.type || 'Refuse Compactor Vehicle';
    if (typeCounts[t] !== undefined) typeCounts[t] += 1;
    else typeCounts[t] = 1;
  });

  localState.chartData.fleetEfficiency = {
    labels: allowedTypes,
    values: allowedTypes.map(t => {
      const count = typeCounts[t] || 0;
      return count > 0 ? 8.0 : 0;
    }),
    color: "#22C55E"
  };

  // 4. Fuel Consumption Trend (L)
  const totalLiters = fuelRecords.reduce((acc, r) => acc + (r.liters || 0), 0);

  localState.chartData.fuelTrend = {
    labels: ["21 Aug", "22 Aug", "23 Aug", "24 Aug", "25 Aug", "26 Aug", "27 Aug"],
    values: [0, 0, 0, 0, 0, 0, Math.round(totalLiters)]
  };

  saveLocalState();
}

export function getLocalState() {
  return localState;
}
