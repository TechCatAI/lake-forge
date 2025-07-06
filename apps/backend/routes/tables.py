# apps/backend/routes/tables.py
from fastapi import APIRouter, HTTPException
from models import TableConfigIn, TableConfigOut
# from crud import list_tables, create_table
import crud

router = APIRouter(prefix="/api/tables", tags=["tables"])

@router.get("", response_model=list[TableConfigOut])
def list_tables():
    return crud.list_tables()

@router.post("", response_model=TableConfigOut, status_code=201)
def create_table(cfg: TableConfigIn):
    return crud.create_table(cfg)
