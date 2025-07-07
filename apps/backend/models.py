# apps/backend/models.py
from pydantic import BaseModel, validator
from typing import List, Optional, Literal, Any


# ---------- TableConfig ----------
class TableConfigBase(BaseModel):
    source_kind: Literal["volume", "external", "jdbc"]
    source_system: str
    catalog: str
    schema_name: str
    table_name: str
    is_enabled: bool = False
    source_path: str
    file_format: Optional[str] = None
    connection_id: Optional[int] = None
    load_type: Literal["full", "incremental"]
    pk_columns: List[str]
    ingest_options: dict[str, Any] = {}


class TableConfigIn(TableConfigBase):  # for POST/PATCH
    pass


class TableConfigOut(TableConfigBase):  # for GET
    id: int


class TableConfigUpdate(BaseModel):
    """Partial table configuration update payload."""

    class Config:
        extra = "forbid"

    source_kind: Optional[Literal["volume", "external", "jdbc"]] = None
    source_system: Optional[str] = None
    catalog: Optional[str] = None
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    is_enabled: Optional[bool] = None
    source_path: Optional[str] = None
    file_format: Optional[str] = None
    connection_id: Optional[int] = None
    load_type: Optional[Literal["full", "incremental"]] = None
    pk_columns: Optional[List[str] | str] = None
    ingest_options: Optional[dict[str, Any]] = None
    updated_by: Optional[str] = None

    @validator("pk_columns", pre=True)
    def _parse_pk(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            if not v:
                return []
            return [part.strip() for part in v.split(",") if part.strip()]
        if isinstance(v, list):
            return v
        raise ValueError("pk_columns must be a comma string or list")

    @validator("pk_columns")
    def _require_pk_if_incremental(cls, v, values):
        load_type = values.get("load_type")
        if load_type == "incremental" and (not v or len(v) == 0):
            raise ValueError("pk_columns required for incremental load")
        return v


# ---------- DQRule ----------
class DQRuleBase(BaseModel):
    table_config_id: int
    rule_name: str
    rule_sql: str
    severity: Literal["warn", "fail", "drop"]


class DQRuleIn(DQRuleBase):
    pass


class DQRuleOut(DQRuleBase):
    id: int
