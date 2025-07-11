# apps/backend/models.py
from pydantic import BaseModel, validator, Field, constr
from typing import List, Optional, Literal, Any
import datetime as dt


# ---------- RawConfig ----------
class RawConfigBase(BaseModel):
    group_id: Optional[int] = None
    source_kind: Literal["sftp", "jdbc", "api", "cloud_storage", "manual"]
    source_system: str
    connection_id: Optional[int] = None
    source_path: str
    ingestion_type: Literal["databricks", "adf", "manual"]
    schedule_id: Optional[int] = None
    copy_options: dict = {}
    output_directory: str
    is_enabled: bool = True

    @validator("source_path")
    def _non_blank_path(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("source_path must not be blank")
        return v


class RawConfigIn(RawConfigBase):
    pass


class RawConfigOut(RawConfigBase):
    id: int
    updated_at: Optional[dt.datetime] = None


class RawConfigUpdate(BaseModel):
    class Config:
        extra = "forbid"

    group_id: Optional[int] = None
    source_kind: Optional[Literal["sftp", "jdbc", "api", "cloud_storage", "manual"]] = None
    source_system: Optional[str] = None
    connection_id: Optional[int] = None
    source_path: Optional[str] = None
    ingestion_type: Optional[Literal["databricks", "adf", "manual"]] = None
    schedule_id: Optional[int] = None
    copy_options: Optional[dict] = None
    output_directory: Optional[str] = None
    is_enabled: Optional[bool] = None
    updated_by: Optional[str] = None

    @validator("source_path")
    def _non_blank_patch(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not str(v).strip():
            raise ValueError("source_path must not be blank")
        return v


# ---------- BronzeConfig ----------
class BronzeConfigBase(BaseModel):
    group_id: Optional[int] = None
    raw_config_id: int
    source_kind: Literal["volume", "external", "jdbc"]
    catalog: str
    schema_name: str
    table_name: str
    source_path: str
    file_format: Optional[str] = None
    connection_id: Optional[int] = None
    load_type: Literal["full", "incremental"]
    pk_columns: List[str]
    watermark_col: Optional[str] = None
    ingest_options: dict = {}
    quarantine: bool = False
    is_enabled: bool = False

    @validator("source_path")
    def _non_blank_path(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("source_path must not be blank")
        return v


class BronzeConfigIn(BronzeConfigBase):
    raw_config_id: Optional[int] = None
    manual_raw: bool = False
    @validator("pk_columns", pre=True)
    def _parse_pk(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [p.strip() for p in v.split(",") if p.strip()]
        if isinstance(v, dict):
            return list(v.values())
        if isinstance(v, list):
            return v
        raise ValueError("pk_columns must be a comma string or list")

    @validator("pk_columns")
    def _require_pk_if_incremental(cls, v, values):
        load_type = values.get("load_type")
        if load_type == "incremental" and (not v or len(v) == 0):
            raise ValueError("pk_columns required for incremental load")
        return v


class BronzeConfigOut(BronzeConfigBase):
    id: int
    updated_at: Optional[dt.datetime] = None


class BronzeConfigUpdate(BaseModel):
    class Config:
        extra = "forbid"

    group_id: Optional[int] = None
    raw_config_id: Optional[int] = None
    source_kind: Optional[Literal["volume", "external", "jdbc"]] = None
    catalog: Optional[str] = None
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    source_path: Optional[str] = None
    file_format: Optional[str] = None
    connection_id: Optional[int] = None
    load_type: Optional[Literal["full", "incremental"]] = None
    pk_columns: Optional[List[str] | str] = None
    watermark_col: Optional[str] = None
    ingest_options: Optional[dict] = None
    quarantine: Optional[bool] = None
    is_enabled: Optional[bool] = None
    updated_by: Optional[str] = None

    @validator("pk_columns", pre=True)
    def _parse_pk(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [part.strip() for part in v.split(",") if part.strip()]
        if isinstance(v, dict):
            return list(v.values())
        if isinstance(v, list):
            return v
        raise ValueError("pk_columns must be a comma string or list")

    @validator("pk_columns")
    def _require_pk_if_incremental(cls, v, values):
        load_type = values.get("load_type")
        if load_type == "incremental" and (not v or len(v) == 0):
            raise ValueError("pk_columns required for incremental load")
        return v

    @validator("source_path")
    def _non_blank_patch(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not str(v).strip():
            raise ValueError("source_path must not be blank")
        return v


# ---------- DQRule ----------
class DQRuleBase(BaseModel):
    table_config_id: int
    rule_name: str
    rule_sql: str
    severity: Literal["warn", "fail", "drop"]
    is_enabled: bool = False


class DQRuleIn(DQRuleBase):
    pass


class DQRuleOut(DQRuleBase):
    id: int
    updated_at: Optional[dt.datetime] = None
    fqtn: str = Field(..., example="sales.raw.customers")


class DQRuleUpdate(BaseModel):
    """Partial DQ rule update payload."""

    class Config:
        extra = "forbid"

    rule_name: Optional[str] = None
    rule_sql: Optional[str] = None
    severity: Optional[Literal["warn", "fail", "drop"]] = None
    is_enabled: Optional[bool] = None
    updated_by: Optional[str] = None


# ---------- Group ----------
class GroupBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    description: Optional[str] = None
    is_enabled: bool = True
    is_raw: bool = False
    is_bronze: bool = False


class GroupIn(GroupBase):
    pass


class GroupOut(GroupBase):
    id: int
    updated_at: Optional[dt.datetime] = None


class GroupUpdate(BaseModel):
    class Config:
        extra = "forbid"

    name: Optional[constr(strip_whitespace=True, min_length=1)] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    is_raw: Optional[bool] = None
    is_bronze: Optional[bool] = None


# ---------- Schedule ----------
class ScheduleBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    description: Optional[str] = None
    days: list[int] = []
    times: list[str] = []
    is_enabled: bool = True

    @validator("days", each_item=True)
    def day_range(cls, d):
        if d < 0 or d > 6:
            raise ValueError("day must be 0-6")
        return d

    @validator("times", each_item=True)
    def time_format(cls, t):
        dt.time.fromisoformat(t)
        return t


class ScheduleIn(ScheduleBase):
    pass


class ScheduleOut(ScheduleBase):
    id: int
    updated_at: Optional[dt.datetime] = None


class ScheduleUpdate(BaseModel):
    class Config:
        extra = "forbid"

    name: Optional[constr(strip_whitespace=True, min_length=1)] = None
    description: Optional[str] = None
    days: Optional[list[int]] = None
    times: Optional[list[str]] = None
    is_enabled: Optional[bool] = None
