from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.analytics import FleetOverviewResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=FleetOverviewResponse, status_code=status.HTTP_200_OK)
def get_fleet_overview(db: Session = Depends(get_db)):
    """Retrieve consolidated summary metrics and KPI stats for the fleet dashboard."""
    return analytics_service.get_fleet_overview(db)
