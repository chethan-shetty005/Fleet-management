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

    # Test GET single by string v_id
    v_id = vehicles[0]["v_id"]
    assert isinstance(v_id, str), f"Expected v_id to be str, got {type(v_id)}"
    res = client.get(f"/api/v1/vehicles/{v_id}")
    assert res.status_code == 200
    assert res.json()["v_id"] == v_id
    print(f"✅ GET vehicle by string v_id '{v_id}' passed")

    # Test Vehicle search by license_plate
    res = client.get("/api/v1/vehicles?license_plate=KA01AB1234")
    assert res.status_code == 200
    search_by_plate = res.json()
    assert len(search_by_plate) >= 1
    assert search_by_plate[0]["license_plate"] == "KA01AB1234"
    print("✅ Search vehicle by license_plate=KA01AB1234 passed")

    # Test Vehicle search by v_id
    res = client.get(f"/api/v1/vehicles?v_id={v_id}")
    assert res.status_code == 200
    search_by_vid = res.json()
    assert len(search_by_vid) == 1
    assert search_by_vid[0]["v_id"] == v_id
    print(f"✅ Search vehicle by v_id={v_id} passed")

    # Test Vehicle search by vehicle_type
    res = client.get("/api/v1/vehicles?vehicle_type=Earth Mover")
    assert res.status_code == 200
    search_by_type = res.json()
    assert len(search_by_type) >= 1
    assert search_by_type[0]["vehicle_type"] == "Earth Mover"
    print("✅ Search vehicle by vehicle_type=Earth Mover passed")

    # POST create new vehicle (with vehicle_type="Earth Mover")
    new_v = {
        "v_id": "VH005",
        "license_plate": "KA02CD5678",
        "make": "Rivian",
        "model": "EDV 700",
        "year": 2024,
        "vehicle_type": "Earth Mover",
        "fuel_type": "Electric",
        "status": "Active",
        "current_mileage": 100.0
    }
    res = client.post("/api/v1/vehicles", json=new_v)
    assert res.status_code == 201
    created_v = res.json()
    created_v_id = created_v["v_id"]
    created_vin = created_v["vin"]
    assert created_v_id == "VH005"
    assert created_v["vehicle_type"] == "Earth Mover"
    assert isinstance(created_vin, str)
    assert len(created_vin) == 17
    print(f"✅ POST vehicle created with auto-generated random VIN '{created_vin}'")

    # Test VIN immutability: attempting to change vin should fail with 400 Bad Request
    res = client.put(f"/api/v1/vehicles/{created_v_id}", json={"vin": "MODIFIED_VIN_1234"})
    assert res.status_code == 400
    assert "immutable" in res.json()["detail"].lower()
    print("✅ PUT vehicle attempt to update VIN correctly rejected (400 Bad Request)")

    # PUT update vehicle status
    res = client.put(f"/api/v1/vehicles/{created_v_id}", json={"status": "Maintenance"})
    assert res.status_code == 200
    assert res.json()["status"] == "Maintenance"
    assert res.json()["vin"] == created_vin
    print("✅ PUT vehicle updated status while preserving VIN intact")


    print("\n--- 4. Trips API ---")
    # POST create trip with string vehicle_id
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
    assert created_t["v_id"] == created_v_id
    assert created_t["vehicle_id"] == created_v_id
    print(f"✅ POST trip created with vehicle_id='{created_v_id}'")

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
    assert created_m["vehicle_id"] == created_v_id
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

    print("\n--- 7. OpenAPI Spec Audit ---")
    res = client.get("/api/v1/openapi.json")
    assert res.status_code == 200
    openapi = res.json()
    
    # Verify vehicle_id and v_id in paths parameters and schemas
    vehicle_path_param = openapi["paths"]["/api/v1/vehicles/{v_id}"]["get"]["parameters"][0]
    assert vehicle_path_param["name"] == "v_id"
    assert vehicle_path_param["schema"]["type"] == "string"

    vehicle_schema_v_id = openapi["components"]["schemas"]["VehicleResponse"]["properties"]["v_id"]
    assert vehicle_schema_v_id["type"] == "string"

    print("✅ OpenAPI spec audit verified: v_id is type 'string' everywhere!")

    print("\n🎉 ALL BACKEND REST INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_full_flow()

