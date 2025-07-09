# apps/backend/routes/tables.py
from fastapi import APIRouter
from models import DQRuleIn, DQRuleOut, DQRuleUpdate

# from crud import list_rules, create_rule
import crud

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=list[DQRuleOut])
def list_rules():
    return crud.list_rules()


@router.post("", response_model=DQRuleOut, status_code=201)
def create_rule(cfg: DQRuleIn):
    return crud.create_rule(cfg)


@router.patch("/{id}", response_model=DQRuleOut)
def update_rule(id: int, payload: DQRuleUpdate):
    return crud.update_rule(id, payload)


@router.delete("/{id}", status_code=204)
def delete_rule(id: int):
    crud.delete_rule(id)
