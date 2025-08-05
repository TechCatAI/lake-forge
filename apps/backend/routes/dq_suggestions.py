# apps/backend/routes/dq_suggestions.py
from fastapi import APIRouter
from models import DQSuggestionOut, DQSuggestionUpdate, BulkActionIn, IdsIn
import crud

router = APIRouter(prefix="/api/dq-suggestions", tags=["dq-suggestions"])


@router.patch("/bulk")
def bulk_update(payload: BulkActionIn):
    status = "accepted" if payload.action == "accept" else "rejected"
    crud.bulk_update_dq_suggestions(payload.ids, status)
    return {"status": "ok"}


@router.post("/implement")
def implement(payload: IdsIn):
    rule_ids = crud.implement_dq_suggestions(payload.ids, user="lake-forge-api")
    return {"rule_ids": rule_ids}


@router.get("", response_model=list[DQSuggestionOut])
def list_suggestions():
    return crud.list_dq_suggestions()


@router.patch("/{id}", response_model=DQSuggestionOut)
def update_suggestion(id: int, payload: DQSuggestionUpdate):
    return crud.update_dq_suggestion(id, payload)
