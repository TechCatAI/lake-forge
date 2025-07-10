from fastapi import APIRouter
from models import GroupIn, GroupOut, GroupUpdate
import crud

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=list[GroupOut])
def list_groups():
    return crud.list_groups()


@router.post("", response_model=GroupOut, status_code=201)
def create_group(payload: GroupIn):
    return crud.create_group(payload)


@router.patch("/{id}", response_model=GroupOut)
def update_group(id: int, payload: GroupUpdate):
    return crud.update_group(id, payload)


@router.delete("/{id}", status_code=204)
def delete_group(id: int):
    crud.delete_group(id)
    return
