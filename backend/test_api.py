import os
import sys
from fastapi.testclient import TestClient

# Ensure backend directory is on sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from seed_data import seed_database

client = TestClient(app)

def test_full_flow():
    print("--- 1. Resetting & Seeding Database ---")
    seed_database()

    print("\n--- 2. Health & Root Endpoint ---")
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}
    print("✅ /health passed")

    res = client.get("/")
    assert res.status_code == 200
    print("✅ / passed")

    print("\n--- 3. Vehicles API ---")
    # GET list
    res = client.get("/api/v1/vehicles")
    assert res.status_code == 200
    vehicles = res.json()
    assert len(vehicles) >= 4
    print(f"✅ List vehicles count: {len(vehicles)}")

    # GET single
    v_id = vehicles[0]["id"]
    res = client.get(f"/api/v1/vehicles/{v_id}")
    assert res.status_code == 200
    assert res.json()["id"] == v_id
    print(f"✅ GET vehicle {v_id} passed")

    # POST create new vehicle
    new_v = {
        "vin": "12345678901234567",
        "license_plate": "TEST-999",
        "make": "Rivian",
        "model": "EDV 700",
        "year": 2024,
        "fuel_type": "Electric",
        "status": "Active",
        "current_mileage": 100.0
    }
    res = client.post("/api/v1/vehicles", json=new_v)
    assert res.status_code == 201
    created_v = res.json()
    created_v_id = created_v["id"]
    print(f"✅ POST vehicle created ID {created_v_id}")

    # PUT update vehicle
    res = client.put(f"/api/v1/vehicles/{created_v_id}", json={"status": "Maintenance"})
    assert res.status_code == 200
    assert res.json()["status"] == "Maintenance"
    print(f"✅ PUT vehicle updated status to Maintenance")

    print("\n--- 4. Trips API ---")
    # POST create trip
    new_t = {
        "trip_number": "TRIP-TEST-001",
        "vehicle_id": created_v_id,
        "start_location": "Depot Alpha",
        "end_location": "Depot Beta",
        "status": "In Progress",
        "distance_miles": 50.0,
        "fuel_consumed_gallons": 0.0
    }
    res = client.post("/api/v1/trips", json=new_t)
    assert res.status_code == 201
    created_t = res.json()
    created_t_id = created_t["id"]
    print(f"✅ POST trip created ID {created_t_id}")

    # PUT complete trip (verifies auto-update of vehicle mileage)
    res = client.put(f"/api/v1/trips/{created_t_id}", json={"status": "Completed", "distance_miles": 50.0})
    assert res.status_code == 200
    assert res.json()["status"] == "Completed"
    
    # Check vehicle mileage updated from 100.0 -> 150.0
    res = client.get(f"/api/v1/vehicles/{created_v_id}")
    assert res.json()["current_mileage"] == 150.0
    print("✅ PUT trip completed & auto-updated vehicle mileage to 150.0")

    print("\n--- 5. Maintenance API ---")
    new_m = {
        "vehicle_id": created_v_id,
        "service_type": "Battery Check",
        "description": "Routine health check for EV battery",
        "cost": 200.0,
        "status": "In Progress",
        "performed_by": "EV Tech Solutions"
    }
    res = client.post("/api/v1/maintenance", json=new_m)
    assert res.status_code == 201
    created_m = res.json()
    created_m_id = created_m["id"]
    print(f"✅ POST maintenance created ID {created_m_id}")

    # DELETE maintenance log
    res = client.delete(f"/api/v1/maintenance/{created_m_id}")
    assert res.status_code == 204
    print("✅ DELETE maintenance log passed")

    print("\n--- 6. Analytics API ---")
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    analytics = res.json()
    assert analytics["total_vehicles"] >= 5
    print(f"✅ Analytics summary: {analytics}")

    print("\n🎉 ALL BACKEND REST INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_full_flow()
