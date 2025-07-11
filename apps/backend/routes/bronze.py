from fastapi import APIRouter, HTTPException
from models import BronzeConfigIn, BronzeConfigOut, BronzeConfigUpdate
import crud

router = APIRouter(prefix="/api/bronze-config", tags=["bronze-config"])

@router.get("", response_model=list[BronzeConfigOut])
def list_bronze():
    return crud.list_bronze()

@router.post("", response_model=BronzeConfigOut, status_code=201)
def create_bronze(payload: BronzeConfigIn):
    try:
        return crud.create_bronze(payload)
    except ValueError as e:
        field = str(e).split()[0]
        raise HTTPException(status_code=422, detail=[{"loc": ["body", field], "msg": str(e)}])

@router.patch("/{id}", response_model=BronzeConfigOut)
def update_bronze(id: int, payload: BronzeConfigUpdate):
    return crud.update_bronze(id, payload)

@router.delete("/{id}", status_code=204)
def delete_bronze(id: int):
    crud.delete_bronze(id)
    return

