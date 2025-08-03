from models import ComputeProfileIn, ComputeProfileOut, ComputeProfileUpdate
import crud
from fastapi import APIRouter

router = APIRouter(prefix="/api/compute-profiles", tags=["compute-profiles"])

@router.get("", response_model=list[ComputeProfileOut])
def list_compute_profiles():
    return crud.list_compute_profiles()

@router.post("", response_model=ComputeProfileOut, status_code=201)
def create_compute_profile(payload: ComputeProfileIn):
    return crud.create_compute_profile(payload)

@router.patch("/{id}", response_model=ComputeProfileOut)
def update_compute_profile(id: int, payload: ComputeProfileUpdate):
    return crud.update_compute_profile(id, payload)

@router.delete("/{id}", status_code=204)
def delete_compute_profile(id: int):
    crud.delete_compute_profile(id)
    return
