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

const API_BASE_URL = 'http://localhost:8000/api/v1';

// In-memory data store initialized with mock data
let localState = {
  kpis: { ...INITIAL_KPIS },
  vehicles: [...INITIAL_VEHICLES],
  fuelRecords: [...INITIAL_FUEL_RECORDS],
  vehicleIssues: [...INITIAL_VEHICLE_ISSUES],
  auditRecords: [...INITIAL_AUDIT_RECORDS],
  chartData: { ...CHART_DATA }
};

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
        return data.map(v => ({
          id: v.v_id || v.id,
          vehicleNo: v.license_plate || v.v_id,
          type: v.vehicle_type || 'Compactor',
          status: v.status || 'Active',
          lastService: '12 Aug 2025',
          driver: v.driver || 'Assigned Driver',
          fuelType: v.fuel_type || 'Diesel',
          mileage: v.current_mileage || 0
        }));
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

  recalculateChartData();
  return newV;
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

export async function deleteVehicle(id) {
  localState.vehicles = localState.vehicles.filter(v => v.id !== id && v.vehicleNo !== id);
  localState.kpis.totalVehicles = Math.max(0, localState.kpis.totalVehicles - 1);
  recalculateChartData();
  return true;
}

export async function deleteFuelRecord(id) {
  localState.fuelRecords = localState.fuelRecords.filter(f => f.id !== id);
  recalculateChartData();
  return true;
}

export async function resolveIssue(issueId) {
  const issue = localState.vehicleIssues.find(i => i.issueId === issueId || i.id === issueId);
  if (issue) {
    issue.status = 'Resolved';
    localState.auditRecords.unshift({
      id: `AUD-${Date.now()}`,
      dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      user: 'Admin User',
      action: 'Issue Resolved',
      entity: 'Vehicle Issue',
      entityId: issue.issueId,
      details: `Resolved issue for vehicle ${issue.vehicleNo}`
    });
  }
  return issue;
}

export function recalculateChartData() {
  const vehicles = localState.vehicles;
  const fuelRecords = localState.fuelRecords;

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

  const baseType = { Compactor: 5650, Tipper: 3250, Tractor: 1950, Loader: 1600 };
  const totalLitersByT = {};
  ['Compactor', 'Tipper', 'Tractor', 'Loader'].forEach(t => {
    totalLitersByT[t] = (baseType[t] || 0) + (typeTotals[t] || 0);
  });
  const sumTypeLiters = Object.values(totalLitersByT).reduce((a, b) => a + b, 0) || 1;

  localState.chartData.fuelByVehicleType = {
    labels: ["Compactor", "Tipper", "Tractor", "Loader"],
    values: ["Compactor", "Tipper", "Tractor", "Loader"].map(t => Math.round(totalLitersByT[t])),
    percentages: ["Compactor", "Tipper", "Tractor", "Loader"].map(t => Number(((totalLitersByT[t] / sumTypeLiters) * 100).toFixed(1))),
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

  const baseFuelType = { Diesel: 9850, CNG: 2600 };
  const totalFuelT = {
    Diesel: baseFuelType.Diesel + (fuelTypeTotals.Diesel || 0),
    CNG: baseFuelType.CNG + (fuelTypeTotals.CNG || 0)
  };
  const sumFuelType = (totalFuelT.Diesel + totalFuelT.CNG) || 1;

  localState.chartData.fuelTypeDistribution = {
    labels: ["Diesel", "CNG"],
    values: [Math.round(totalFuelT.Diesel), Math.round(totalFuelT.CNG)],
    percentages: [
      Number(((totalFuelT.Diesel / sumFuelType) * 100).toFixed(1)),
      Number(((totalFuelT.CNG / sumFuelType) * 100).toFixed(1))
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

  const baseEff = { Compactor: 8.6, Tipper: 7.4, Tractor: 6.8, Loader: 8.1, Truck: 7.2 };
  localState.chartData.fleetEfficiency = {
    labels: ["Compactor", "Tipper", "Tractor", "Loader", "Truck"],
    values: ["Compactor", "Tipper", "Tractor", "Loader", "Truck"].map(t => {
      const addedCount = typeCounts[t] || 0;
      return Number(Math.min(9.9, Math.max(5.0, baseEff[t] + (addedCount * 0.1))).toFixed(1));
    }),
    color: "#22C55E"
  };

  // 4. Fuel Consumption Trend (L)
  const addedRecentLiters = fuelRecords.reduce((acc, r) => acc + (r.liters || 0), 0);
  const updatedLastValue = Math.round(9100 + addedRecentLiters * 0.5);

  localState.chartData.fuelTrend = {
    labels: ["21 Aug", "22 Aug", "23 Aug", "24 Aug", "25 Aug", "26 Aug", "27 Aug"],
    values: [7200, 6800, 8100, 8400, 8300, 9800, updatedLastValue]
  };

  // Update total KPIs
  localState.kpis.fuelConsumedLiters = Math.round(sumTypeLiters);
}

export function getLocalState() {
  return localState;
}
