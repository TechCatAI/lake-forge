from fastapi import APIRouter
from models import SourceSystemIn, SourceSystemOut, SourceSystemUpdate
import crud

router = APIRouter(prefix="/api/source-systems", tags=["source-systems"])

@router.get("", response_model=list[SourceSystemOut])
def list_sources():
    return crud.list_source_systems()

@router.post("", response_model=SourceSystemOut, status_code=201)
def create_source(payload: SourceSystemIn):
    return crud.create_source_system(payload)

@router.patch("/{id}", response_model=SourceSystemOut)
def update_source(id: int, payload: SourceSystemUpdate):
    return crud.update_source_system(id, payload)

@router.delete("/{id}", status_code=204)
def delete_source(id: int):
    crud.delete_source_system(id)
    return
