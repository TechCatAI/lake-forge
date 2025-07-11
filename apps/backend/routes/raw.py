from fastapi import APIRouter, HTTPException
from models import RawConfigIn, RawConfigOut, RawConfigUpdate
import crud

router = APIRouter(prefix="/api/raw-config", tags=["raw-config"])

@router.get("", response_model=list[RawConfigOut])
def list_raw():
    return crud.list_raw()

@router.post("", response_model=RawConfigOut, status_code=201)
def create_raw(payload: RawConfigIn):
    try:
        return crud.create_raw(payload)
    except ValueError as e:
        field = str(e).split()[0]
        raise HTTPException(status_code=422, detail=[{"loc": ["body", field], "msg": str(e)}])

@router.patch("/{id}", response_model=RawConfigOut)
def update_raw(id: int, payload: RawConfigUpdate):
    return crud.update_raw(id, payload)

@router.delete("/{id}", status_code=204)
def delete_raw(id: int):
    crud.delete_raw(id)
    return

