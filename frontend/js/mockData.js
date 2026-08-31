/**
 * WASTRAQ Fleet & Fuel Management Mock Dataset
 * Matches 1:1 with the reference dashboard UI design mockup
 */

export const INITIAL_KPIS = {
  totalVehicles: 126,
  activeVehicles: 98,
  activePercentage: 77.8,
  inactiveVehicles: 18,
  inactivePercentage: 14.3,
  vehiclesWithIssues: 10,
  issuesPercentage: 7.9,
  fuelConsumedLiters: 12450,
  fuelSpendRupees: 875600,
  lastUpdated: "27 Aug 2025 11:30 AM"
};

export const INITIAL_VEHICLES = [
  { id: "KA01AB1234", vehicleNo: "KA01AB1234", type: "Compactor", status: "Active", lastService: "12 Aug 2025", driver: "Ramesh Kumar", fuelType: "Diesel", mileage: 42350 },
  { id: "KA01CD5678", vehicleNo: "KA01CD5678", type: "Tipper", status: "Active", lastService: "08 Aug 2025", driver: "Suresh Patil", fuelType: "Diesel", mileage: 38200 },
  { id: "KA01EF9012", vehicleNo: "KA01EF9012", type: "Tractor", status: "Inactive", lastService: "25 Jul 2025", driver: "Mahesh Singh", fuelType: "Diesel", mileage: 51900 },
  { id: "KA01GH3456", vehicleNo: "KA01GH3456", type: "Compactor", status: "Active", lastService: "10 Aug 2025", driver: "Anand Verma", fuelType: "CNG", mileage: 29400 },
  { id: "KA01IJ7890", vehicleNo: "KA01IJ7890", type: "Loader", status: "Active", lastService: "05 Aug 2025", driver: "Vijay Gowda", fuelType: "Diesel", mileage: 18750 },
  { id: "KA01KL2345", vehicleNo: "KA01KL2345", type: "Compactor", status: "Maintenance", lastService: "23 Aug 2025", driver: "Praveen R", fuelType: "Diesel", mileage: 64100 },
  { id: "KA01MN5678", vehicleNo: "KA01MN5678", type: "Tipper", status: "Active", lastService: "22 Aug 2025", driver: "Kiran Naik", fuelType: "Diesel", mileage: 31050 }
];

export const INITIAL_FUEL_RECORDS = [
  { id: "FR-2025-0842", date: "27 Aug 2025", vehicleNo: "KA01AB1234", fuelType: "Diesel", liters: 120.00, amount: 7200.00 },
  { id: "FR-2025-0841", date: "27 Aug 2025", vehicleNo: "KA01CD5678", fuelType: "Diesel", liters: 150.00, amount: 9000.00 },
  { id: "FR-2025-0840", date: "26 Aug 2025", vehicleNo: "KA01EF9012", fuelType: "Diesel", liters: 80.00, amount: 4800.00 },
  { id: "FR-2025-0839", date: "26 Aug 2025", vehicleNo: "KA01GH3456", fuelType: "CNG", liters: 110.00, amount: 6600.00 },
  { id: "FR-2025-0838", date: "25 Aug 2025", vehicleNo: "KA01IJ7890", fuelType: "Diesel", liters: 90.00, amount: 5400.00 },
  { id: "FR-2025-0837", date: "25 Aug 2025", vehicleNo: "KA01KL2345", fuelType: "Diesel", liters: 135.00, amount: 8100.00 }
];

export const INITIAL_VEHICLE_ISSUES = [
  { id: "IS-1023", issueId: "IS-1023", vehicleNo: "KA01GH3456", issue: "Hydraulic system leak", severity: "High", status: "Open", reportedOn: "24 Aug 2025" },
  { id: "IS-1022", issueId: "IS-1022", vehicleNo: "KA01KL2345", issue: "Engine overheating", severity: "Medium", status: "In Progress", reportedOn: "23 Aug 2025" },
  { id: "IS-1021", issueId: "IS-1021", vehicleNo: "KA01MN5678", issue: "Brake adjustment required", severity: "Low", status: "Open", reportedOn: "22 Aug 2025" },
  { id: "IS-1020", issueId: "IS-1020", vehicleNo: "KA01OP9012", issue: "Tyre wear", severity: "Low", status: "Resolved", reportedOn: "20 Aug 2025" },
  { id: "IS-1019", issueId: "IS-1019", vehicleNo: "KA01QR3456", issue: "Electrical wiring issue", severity: "Medium", status: "Closed", reportedOn: "19 Aug 2025" }
];

export const INITIAL_AUDIT_RECORDS = [
  { id: "AUD-1001", dateTime: "27 Aug 2025 10:45 AM", user: "Admin User", action: "Fuel Added", entity: "Fuel Record", entityId: "FR-2025-0842", details: "Added 120.00 L for KA01AB1234" },
  { id: "AUD-1002", dateTime: "27 Aug 2025 10:30 AM", user: "Admin User", action: "Vehicle Updated", entity: "Vehicle", entityId: "KA01AB1234", details: "Updated status to Active" },
  { id: "AUD-1003", dateTime: "27 Aug 2025 09:15 AM", user: "Admin User", action: "Issue Updated", entity: "Vehicle Issue", entityId: "IS-1023", details: "Changed status to In Progress" },
  { id: "AUD-1004", dateTime: "26 Aug 2025 04:22 PM", user: "Admin User", action: "Fuel Deleted", entity: "Fuel Record", entityId: "FR-2025-0831", details: "Deleted 60.00 L record" },
  { id: "AUD-1005", dateTime: "26 Aug 2025 11:05 AM", user: "Admin User", action: "Vehicle Added", entity: "Vehicle", entityId: "KA01ST6789", details: "New vehicle added" }
];

export const CHART_DATA = {
  fuelTrend: {
    labels: ["21 Aug", "22 Aug", "23 Aug", "24 Aug", "25 Aug", "26 Aug", "27 Aug"],
    values: [7200, 6800, 8100, 8400, 8300, 9800, 9100]
  },
  fuelByVehicleType: {
    labels: ["Compactor", "Tipper", "Tractor", "Loader"],
    values: [5650, 3250, 1950, 1600],
    percentages: [45.4, 26.1, 15.7, 12.8],
    colors: ["#3B82F6", "#A855F7", "#EAB308", "#22C55E"]
  },
  fleetEfficiency: {
    labels: ["Compactor", "Tipper", "Tractor", "Loader", "Truck"],
    values: [8.6, 7.4, 6.8, 8.1, 7.2],
    color: "#22C55E"
  },
  fuelTypeDistribution: {
    labels: ["Diesel", "CNG"],
    values: [9850, 2600],
    percentages: [79.1, 20.9],
    colors: ["#2563EB", "#10B981"]
  }
};
