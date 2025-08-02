from fastapi import APIRouter
from models import ConnectionIn, ConnectionOut, ConnectionUpdate
import crud

router = APIRouter(prefix="/api/connections", tags=["connections"])

@router.get("", response_model=list[ConnectionOut])
def list_connections():
    return crud.list_connections()

@router.post("", response_model=ConnectionOut, status_code=201)
def create_connection(payload: ConnectionIn):
    return crud.create_connection(payload)

@router.patch("/{id}", response_model=ConnectionOut)
def update_connection(id: int, payload: ConnectionUpdate):
    return crud.update_connection(id, payload)

@router.delete("/{id}", status_code=204)
def delete_connection(id: int):
    crud.delete_connection(id)
    return
