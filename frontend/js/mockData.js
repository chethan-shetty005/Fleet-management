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
  { id: "VH001", vehicle_code: "VH001", vehicleNo: "KA01AB1234", brand: "Tata", type: "Refuse Compactor Vehicle", vehicleType: "Refuse Compactor Vehicle", status: "Active", lastService: "12 Aug 2025", driver: "Ramesh Kumar", fuelType: "Diesel", serviceDueFreq: 30, serviceDueKm: 5000, ward: 1, mileage: 42350 },
  { id: "VH002", vehicle_code: "VH002", vehicleNo: "KA01CD5678", brand: "Mahindra", type: "Tractor", vehicleType: "Tractor", status: "Active", lastService: "08 Aug 2025", driver: "Suresh Patil", fuelType: "Diesel", serviceDueFreq: 30, serviceDueKm: 5000, ward: 2, mileage: 38200 },
  { id: "VH003", vehicle_code: "VH003", vehicleNo: "KA01EF9012", brand: "Tata", type: "Tata Ace", vehicleType: "Tata Ace", status: "Inactive", lastService: "25 Jul 2025", driver: "Mahesh Singh", fuelType: "Petrol", serviceDueFreq: 60, serviceDueKm: 10000, ward: 3, mileage: 51900 },
  { id: "VH004", vehicle_code: "VH004", vehicleNo: "KA01GH3456", brand: "Piaggio", type: "EV Auto", vehicleType: "EV Auto", status: "Active", lastService: "10 Aug 2025", driver: "Anand Verma", fuelType: "Electric Charge", serviceDueFreq: 45, serviceDueKm: 8000, ward: 4, mileage: 29400 },
  { id: "VH005", vehicle_code: "VH005", vehicleNo: "KA01IJ7890", brand: "Local", type: "Pushcart", vehicleType: "Pushcart", status: "Active", lastService: "05 Aug 2025", driver: "Vijay Gowda", fuelType: "Electric Charge", serviceDueFreq: 90, serviceDueKm: 2000, ward: 5, mileage: 18750 },
  { id: "VH006", vehicle_code: "VH006", vehicleNo: "KA01KL2345", brand: "Tata", type: "Refuse Compactor Vehicle", vehicleType: "Refuse Compactor Vehicle", status: "Maintenance", lastService: "23 Aug 2025", driver: "Praveen R", fuelType: "Diesel", serviceDueFreq: 30, serviceDueKm: 5000, ward: 1, mileage: 64100 },
  { id: "VH007", vehicle_code: "VH007", vehicleNo: "KA01MN5678", brand: "Mahindra", type: "Tractor", vehicleType: "Tractor", status: "Active", lastService: "22 Aug 2025", driver: "Kiran Naik", fuelType: "Diesel", serviceDueFreq: 30, serviceDueKm: 5000, ward: 2, mileage: 31050 }
];

export const INITIAL_FUEL_RECORDS = [
  { id: "FR-2025-0845", date: "27 Aug 2025", vehicleNo: "KA01GH3456", fuelType: "Electric Charge", liters: 95.00, amount: 2850.00 },
  { id: "FR-2025-0844", date: "27 Aug 2025", vehicleNo: "KA01EF9012", fuelType: "Petrol", liters: 85.00, amount: 8925.00 },
  { id: "FR-2025-0842", date: "27 Aug 2025", vehicleNo: "KA01AB1234", fuelType: "Diesel", liters: 120.00, amount: 7200.00 },
  { id: "FR-2025-0841", date: "27 Aug 2025", vehicleNo: "KA01CD5678", fuelType: "Diesel", liters: 150.00, amount: 9000.00 }
];

export const INITIAL_VEHICLE_ISSUES = [
  { id: "IS-1023", issueId: "IS-1023", vehicleNo: "KA01GH3456", issue: "Hydraulic system leak", severity: "High", status: "Open", reportedOn: "24 Aug 2025" },
  { id: "IS-1022", issueId: "IS-1022", vehicleNo: "KA01KL2345", issue: "Engine overheating", severity: "Medium", status: "In Progress", reportedOn: "23 Aug 2025" },
  { id: "IS-1021", issueId: "IS-1021", vehicleNo: "KA01MN5678", issue: "Brake adjustment required", severity: "Low", status: "Open", reportedOn: "22 Aug 2025" }
];

export const INITIAL_AUDIT_RECORDS = [
  { id: "AUD-1001", dateTime: "27 Aug 2025 10:45 AM", user: "Admin User", action: "Fuel Added", entity: "Fuel Record", entityId: "FR-2025-0842", details: "Added 120.00 L for KA01AB1234" },
  { id: "AUD-1002", dateTime: "27 Aug 2025 10:30 AM", user: "Admin User", action: "Vehicle Updated", entity: "Vehicle", entityId: "KA01AB1234", details: "Updated status to Active" }
];

export const CHART_DATA = {
  fuelTrend: {
    labels: ["21 Aug", "22 Aug", "23 Aug", "24 Aug", "25 Aug", "26 Aug", "27 Aug"],
    values: [7200, 6800, 8100, 8400, 8300, 9800, 9100]
  },
  fuelByVehicleType: {
    labels: ["Pushcart", "EV Auto", "Tata Ace", "Tractor", "Refuse Compactor Vehicle"],
    values: [1200, 2400, 3100, 3950, 5650],
    percentages: [7.4, 14.7, 19.0, 24.2, 34.7],
    colors: ["#3B82F6", "#A855F7", "#EAB308", "#22C55E", "#EC4899"]
  },
  fleetEfficiency: {
    labels: ["Pushcart", "EV Auto", "Tata Ace", "Tractor", "Refuse Compactor Vehicle"],
    values: [9.5, 9.0, 8.2, 7.1, 6.5],
    color: "#22C55E"
  },
  fuelTypeDistribution: {
    labels: ["Petrol", "Diesel", "Electric Charge"],
    values: [3100, 9600, 3600],
    percentages: [19.0, 58.9, 22.1],
    colors: ["#2563EB", "#10B981", "#F59E0B"]
  }
};

