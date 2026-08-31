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
          ward: v.ward || 'Ward 1',
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
    ward: vehicleData.ward,
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
    details: `Added new ${newV.type} vehicle (${newV.ward})`
  });

  return newV;
}

export async function addFuelRecord(record) {
  const newRecord = {
    id: `FR-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    date: record.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    vehicleNo: record.vehicleNo,
    fuelType: record.fuelType || 'Diesel',
    liters: Number(record.liters),
    amount: Number(record.amount),
    ward: record.ward || 'Ward 1'
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

  return newRecord;
}

export async function deleteVehicle(id) {
  localState.vehicles = localState.vehicles.filter(v => v.id !== id && v.vehicleNo !== id);
  localState.kpis.totalVehicles = Math.max(0, localState.kpis.totalVehicles - 1);
  return true;
}

export async function deleteFuelRecord(id) {
  localState.fuelRecords = localState.fuelRecords.filter(f => f.id !== id);
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

export function getLocalState() {
  return localState;
}
