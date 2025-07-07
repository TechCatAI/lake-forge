# apps/backend/routes/tables.py
from fastapi import APIRouter
from models import DQRuleIn, DQRuleOut

# from crud import list_rules, create_rule
import crud

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=list[DQRuleOut])
def list_rules():
    return crud.list_rules()


@router.post("", response_model=DQRuleOut, status_code=201)
def create_rule(cfg: DQRuleIn):
    return crud.create_rule(cfg)
