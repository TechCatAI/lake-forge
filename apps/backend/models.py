# apps/backend/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any

# ---------- TableConfig ----------
class TableConfigBase(BaseModel):
    source_kind:  Literal['volume', 'external', 'jdbc']
    source_system: str
    catalog: str
    schema_name: str
    table_name: str
    is_enabled: bool = False
    source_path: str
    file_format: Optional[str] = None
    connection_id: Optional[int] = None
    load_type: Literal['full', 'incremental']
    pk_columns: List[str]
    ingest_options: dict[str, Any] = {}

class TableConfigIn(TableConfigBase):      # for POST/PATCH
    pass

class TableConfigOut(TableConfigBase):     # for GET
    id: int

# ---------- DQRule ----------
class DQRuleBase(BaseModel):
    table_config_id: int
    rule_name: str
    rule_sql: str
    severity: Literal['warn', 'fail', 'drop']

class DQRuleIn(DQRuleBase):
    pass

class DQRuleOut(DQRuleBase):
    id: int
