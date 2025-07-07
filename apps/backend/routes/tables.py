# apps/backend/routes/tables.py
from fastapi import APIRouter, HTTPException
from models import TableConfigIn, TableConfigOut, TableConfigUpdate

# from crud import list_tables, create_table
import crud

router = APIRouter(prefix="/api/tables", tags=["tables"])


@router.get("", response_model=list[TableConfigOut])
def list_tables():
    return crud.list_tables()


@router.post("", response_model=TableConfigOut, status_code=201)
def create_table(cfg: TableConfigIn):
    try:
        return crud.create_table(cfg)
    except ValueError as e:
        field = str(e).split()[0]
        raise HTTPException(
            status_code=422,
            detail=[{"loc": ["body", field], "msg": str(e)}],
        )


@router.patch("/{id}", response_model=TableConfigOut)
def update_table(id: int, payload: TableConfigUpdate):
    """Partially update table configuration by ID."""
    return crud.update_table(id, payload)
