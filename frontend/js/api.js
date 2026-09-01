/**
 * WASTRAQ Fleet Management API Service Layer
 * Connects to FastAPI Backend at http://localhost:8000/api/v1
 * with automatic fallback to mock data store.
 */

import {
  INITIAL_KPIS,
  INITIAL_VEHICLES,
  INITIAL_FUEL_RECORDS,
  INITIAL_VEHICLE_ISSUES,
  INITIAL_AUDIT_RECORDS,
  CHART_DATA
} from './mockData.js';

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

// Data store initialized from localStorage if present, preserving newly added data on refresh
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

export async function fetchKPIs() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/overview`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return {
        ...localState.kpis,
        totalVehicles: data.total_vehicles || localState.kpis.totalVehicles,
        activeVehicles: data.active_vehicles || localState.kpis.activeVehicles,
        inactiveVehicles: data.maintenance_vehicles || localState.kpis.inactiveVehicles
      };
    }
  } catch (err) {
    console.log('Using local state for KPIs');
  }
  return localState.kpis;
}

export async function fetchVehicles() {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(v => {
          const vNo = v.license_plate || v.v_id || v.id;
          const existing = localState.vehicles.find(item => item.id === vNo || item.vehicleNo === vNo);
          if (existing) {
            existing.status = v.status || existing.status;
            existing.type = v.vehicle_type || existing.type;
            existing.fuelType = v.fuel_type || existing.fuelType;
            existing.mileage = v.current_mileage || existing.mileage;
          } else {
            localState.vehicles.push({
              id: v.v_id || v.id || vNo,
              vehicleNo: vNo,
              type: v.vehicle_type || 'Compactor',
              status: v.status || 'Active',
              lastService: '12 Aug 2025',
              driver: v.driver || 'Assigned Driver',
              fuelType: v.fuel_type || 'Diesel',
              mileage: v.current_mileage || 0
            });
          }
        });
        saveLocalState();
      }
    }
  } catch (err) {
    console.log('Using local state for Vehicles');
  }
  return localState.vehicles;
}

export async function addVehicle(vehicleData) {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        v_id: vehicleData.vehicleNo,
        license_plate: vehicleData.vehicleNo,
        make: vehicleData.make || 'Tata',
        model: vehicleData.type || 'Compactor',
        year: 2024,
        vehicle_type: vehicleData.type,
        fuel_type: vehicleData.fuelType,
        status: vehicleData.status || 'Active',
        current_mileage: Number(vehicleData.mileage || 0)
      })
    });
    if (res.ok) {
      console.log('Vehicle saved to backend');
    }
  } catch (err) {
    console.log('Local store vehicle add fallback');
  }

  // Update local state
  const newV = {
    id: vehicleData.vehicleNo,
    vehicleNo: vehicleData.vehicleNo,
    type: vehicleData.type,
    status: vehicleData.status || 'Active',
    lastService: 'Just now',
    driver: vehicleData.driver || 'Admin Assigned',
    fuelType: vehicleData.fuelType || 'Diesel',
    mileage: Number(vehicleData.mileage || 0)
  };
  localState.vehicles.unshift(newV);
  localState.kpis.totalVehicles += 1;
  if (newV.status === 'Active') localState.kpis.activeVehicles += 1;
  else localState.kpis.inactiveVehicles += 1;

  // Add audit log
  localState.auditRecords.unshift({
    id: `AUD-${Date.now()}`,
    dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    user: 'Admin User',
    action: 'Vehicle Added',
    entity: 'Vehicle',
    entityId: newV.vehicleNo,
    details: `Added new ${newV.type} vehicle (${newV.vehicleNo})`
  });

  saveLocalState();
  recalculateChartData();
  return newV;
}

export async function fetchFuelRecords() {
  try {
    const res = await fetch(`${API_BASE_URL}/fuel`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const dbRecords = await res.json();
      if (Array.isArray(dbRecords) && dbRecords.length > 0) {
        dbRecords.forEach(dbR => {
          if (!localState.fuelRecords.some(r => r.id === dbR.id)) {
            localState.fuelRecords.unshift(dbR);
          }
        });
        saveLocalState();
        recalculateChartData();
      }
    }
  } catch (err) {
    console.log('Using local store for Fuel Records');
  }
  return localState.fuelRecords;
}

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
    if (res.ok) {
      const savedObj = await res.json();
      if (savedObj && savedObj.id) newRecord.id = savedObj.id;
    }
  } catch (err) {
    console.log('DB save fallback to local storage:', err);
  }

  localState.fuelRecords.unshift(newRecord);
  localState.kpis.fuelConsumedLiters += newRecord.liters;
  localState.kpis.fuelSpendRupees += newRecord.amount;

  localState.auditRecords.unshift({
    id: `AUD-${Date.now()}`,
    dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    user: 'Admin User',
    action: 'Fuel Added',
    entity: 'Fuel Record',
    entityId: newRecord.id,
    details: `Added ${newRecord.liters.toFixed(2)} L for ${newRecord.vehicleNo}`
  });

  recalculateChartData();
  return newRecord;
}

export async function addVehicleIssue(issueData) {
  const newIssue = {
    id: `ISS-${Date.now()}`,
    issueId: `ISS-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleNo: issueData.vehicleNo,
    issue: issueData.issue,
    severity: issueData.severity || 'Medium',
    status: issueData.status || 'Open',
    reportedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  try {
    await fetch(`${API_BASE_URL}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: newIssue.issueId,
        v_id: newIssue.vehicleNo,
        description: newIssue.issue,
        severity: newIssue.severity,
        status: newIssue.status
      })
    });
  } catch (err) {
    console.log('DB issue save fallback to local storage:', err);
  }

  localState.vehicleIssues.unshift(newIssue);

  // Automatically update vehicle status to "Maintenance" when an issue is raised
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
}

export async function deleteVehicle(id) {
  localState.vehicles = localState.vehicles.filter(v => v.id !== id && v.vehicleNo !== id);
  localState.kpis.totalVehicles = Math.max(0, localState.kpis.totalVehicles - 1);
  recalculateChartData();
  return true;
}

export async function updateVehicleStatus(id, newStatus) {
  const v = localState.vehicles.find(item => item.id === id || item.vehicleNo === id);
  if (v) {
    const oldStatus = v.status;
    v.status = newStatus;

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        await fetch(`${API_BASE_URL}/vehicles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }
    } catch (err) {
      console.log('Local store vehicle status update fallback');
    }

    let active = 0;
    let inactive = 0;
    localState.vehicles.forEach(item => {
      if (item.status === 'Active') active++;
      else inactive++;
    });
    localState.kpis.activeVehicles = active;
    localState.kpis.inactiveVehicles = inactive;

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
  return v;
}

export async function deleteFuelRecord(id) {
  try {
    await fetch(`${API_BASE_URL}/fuel/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.log('DB delete fallback to local storage:', err);
  }
  localState.fuelRecords = localState.fuelRecords.filter(f => f.id !== id);
  recalculateChartData();
  return true;
}

export async function resolveIssue(issueId) {
  return await updateIssueStatus(issueId, 'Resolved');
}

export async function updateIssueStatus(issueId, newStatus) {
  const issue = localState.vehicleIssues.find(i => i.issueId === issueId || i.id === issueId);
  if (issue) {
    const oldStatus = issue.status;
    issue.status = newStatus;

    try {
      await fetch(`${API_BASE_URL}/issues/${issueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.log('Local store issue status update fallback');
    }

    // Automatically update vehicle status to "Out of Service" when issue is Resolved or Closed
    if ((newStatus === 'Resolved' || newStatus === 'Closed') && issue.vehicleNo) {
      await updateVehicleStatus(issue.vehicleNo, 'Out of Service');
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
}

export function recalculateChartData() {
  const vehicles = localState.vehicles || [];
  const fuelRecords = localState.fuelRecords || [];

  // 1. Fuel by Vehicle Type
  const typeTotals = { Compactor: 0, Tipper: 0, Tractor: 0, Loader: 0 };
  fuelRecords.forEach(rec => {
    const v = vehicles.find(item => item.vehicleNo === rec.vehicleNo || item.id === rec.vehicleNo);
    const vType = v ? v.type : (rec.vehicleType || 'Compactor');
    if (typeTotals[vType] !== undefined) {
      typeTotals[vType] += rec.liters;
    } else {
      typeTotals[vType] = rec.liters;
    }
  });

  const sumTypeLiters = Object.values(typeTotals).reduce((a, b) => a + b, 0);

  localState.chartData.fuelByVehicleType = {
    labels: ["Compactor", "Tipper", "Tractor", "Loader"],
    values: ["Compactor", "Tipper", "Tractor", "Loader"].map(t => Math.round(typeTotals[t] || 0)),
    percentages: ["Compactor", "Tipper", "Tractor", "Loader"].map(t => sumTypeLiters > 0 ? Number((( (typeTotals[t] || 0) / sumTypeLiters) * 100).toFixed(1)) : 0),
    colors: ["#3B82F6", "#A855F7", "#EAB308", "#22C55E"]
  };

  // 2. Fuel Type Distribution (Diesel vs CNG)
  const fuelTypeTotals = { Diesel: 0, CNG: 0 };
  fuelRecords.forEach(rec => {
    const fType = rec.fuelType || 'Diesel';
    if (fuelTypeTotals[fType] !== undefined) {
      fuelTypeTotals[fType] += rec.liters;
    } else {
      fuelTypeTotals[fType] = rec.liters;
    }
  });

  const sumFuelType = (fuelTypeTotals.Diesel + fuelTypeTotals.CNG);

  localState.chartData.fuelTypeDistribution = {
    labels: ["Diesel", "CNG"],
    values: [Math.round(fuelTypeTotals.Diesel), Math.round(fuelTypeTotals.CNG)],
    percentages: [
      sumFuelType > 0 ? Number(((fuelTypeTotals.Diesel / sumFuelType) * 100).toFixed(1)) : 0,
      sumFuelType > 0 ? Number(((fuelTypeTotals.CNG / sumFuelType) * 100).toFixed(1)) : 0
    ],
    colors: ["#2563EB", "#10B981"]
  };

  // 3. Fleet Efficiency (km/L per vehicle type)
  const typeCounts = { Compactor: 0, Tipper: 0, Tractor: 0, Loader: 0, Truck: 0 };
  vehicles.forEach(v => {
    const t = v.type || 'Compactor';
    if (typeCounts[t] !== undefined) typeCounts[t] += 1;
    else typeCounts[t] = 1;
  });

  localState.chartData.fleetEfficiency = {
    labels: ["Compactor", "Tipper", "Tractor", "Loader", "Truck"],
    values: ["Compactor", "Tipper", "Tractor", "Loader", "Truck"].map(t => {
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

  // Update total KPIs
  localState.kpis.fuelConsumedLiters = Math.round(sumTypeLiters);
  localState.kpis.totalVehicles = vehicles.length;
  localState.kpis.activeVehicles = vehicles.filter(v => v.status === 'Active').length;
  localState.kpis.inactiveVehicles = vehicles.filter(v => v.status !== 'Active').length;
  localState.kpis.fuelSpendRupees = fuelRecords.reduce((acc, r) => acc + (r.amount || 0), 0);

  saveLocalState();
}

export function getLocalState() {
  return localState;
}
