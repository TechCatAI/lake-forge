from fastapi import APIRouter
from models import ScheduleIn, ScheduleOut, ScheduleUpdate
import crud

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleOut])
def list_schedules():
    return crud.list_schedules()


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(payload: ScheduleIn):
    return crud.create_schedule(payload)


@router.patch("/{id}", response_model=ScheduleOut)
def update_schedule(id: int, payload: ScheduleUpdate):
    return crud.update_schedule(id, payload)


@router.delete("/{id}", status_code=204)
def delete_schedule(id: int):
    crud.delete_schedule(id)
    return
