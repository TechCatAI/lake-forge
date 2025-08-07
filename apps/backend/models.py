# apps/backend/models.py
from pydantic import BaseModel, validator, Field, constr, root_validator
from typing import List, Optional, Literal
import datetime as dt


# ---------- RawConfig ----------
class RawConfigBase(BaseModel):
    group_id: Optional[int] = None
    source_system_id: Optional[int] = None
    connection_id: Optional[int] = None
    source_path: str
    ingestion_type: Literal["databricks", "adf", "manual"]
    copy_options: dict = {}
    output_directory: str
    file_format: Optional[str] = None
    watermark_col: Optional[str] = None
    watermark: Optional[dt.datetime] = None
    watermark_increment_sec: Optional[int] = None
    watermark_initial: Optional[dt.datetime] = None
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
    source_system_id: Optional[int] = None
    connection_id: Optional[int] = None
    source_path: Optional[str] = None
    ingestion_type: Optional[Literal["databricks", "adf", "manual"]] = None
    copy_options: Optional[dict] = None
    output_directory: Optional[str] = None
    file_format: Optional[str] = None
    watermark_col: Optional[str] = None
    watermark: Optional[dt.datetime] = None
    watermark_increment_sec: Optional[int] = None
    watermark_initial: Optional[dt.datetime] = None
    is_enabled: Optional[bool] = None
    updated_by: Optional[str] = None


# ---------- BronzeConfig ----------
class BronzeConfigBase(BaseModel):
    group_id: Optional[int] = None
    raw_config_id: int
    source_kind: Literal["volume", "external", "jdbc"]
    catalog: str
    schema_name: str
    table_name: str
    connection_id: Optional[int] = None
    load_type: Literal["full", "incremental", "append", "mergedelete"]
    is_stream: bool = False
    pk_columns: List[str]
    clusterby_cols: Optional[List[str]] = None
    watermark_col: Optional[str] = None
    scd_type: Optional[int] = 0
    ingest_options: dict = {}
    quarantine: bool = False
    is_enabled: bool = True


class BronzeConfigIn(BronzeConfigBase):
    @validator("pk_columns", "clusterby_cols", pre=True)
    def _parse_list(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [p.strip() for p in v.split(",") if p.strip()]
        if isinstance(v, dict):
            return list(v.values())
        if isinstance(v, list):
            return v
        raise ValueError("value must be a comma string or list")

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
    connection_id: Optional[int] = None
    load_type: Optional[Literal["full", "incremental", "append", "mergedelete"]] = None
    is_stream: Optional[bool] = None
    pk_columns: Optional[List[str] | str] = None
    clusterby_cols: Optional[List[str] | str] = None
    watermark_col: Optional[str] = None
    scd_type: Optional[int] = None
    ingest_options: Optional[dict] = None
    quarantine: Optional[bool] = None
    is_enabled: Optional[bool] = None
    updated_by: Optional[str] = None

    @validator("pk_columns", "clusterby_cols", pre=True)
    def _parse_list_u(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [part.strip() for part in v.split(",") if part.strip()]
        if isinstance(v, dict):
            return list(v.values())
        if isinstance(v, list):
            return v
        raise ValueError("value must be a comma string or list")

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


# ---------- DQSuggestion ----------
class DQSuggestionOut(BaseModel):
    id: int
    table_config_id: int
    table_name: str
    rule_name: str
    rule_sql: str
    severity: Literal["warn", "fail", "drop"]
    suggestion_status: Literal[
        "new", "accepted", "rejected", "implemented", "disabled"
    ]
    profiled_at: dt.datetime
    note: Optional[str] = None


class DQSuggestionUpdate(BaseModel):
    class Config:
        extra = "forbid"

    rule_name: Optional[str] = None
    rule_sql: Optional[str] = None
    severity: Optional[Literal["warn", "fail", "drop"]] = None
    note: Optional[str] = None
    suggestion_status: Optional[
        Literal["new", "accepted", "rejected", "implemented", "disabled"]
    ] = None
    updated_by: Optional[str] = None


class BulkActionIn(BaseModel):
    ids: List[int]
    action: Literal["accept", "reject"]


class IdsIn(BaseModel):
    ids: List[int]


# ---------- ComputeProfile ----------
class ComputeProfileBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    description: Optional[str] = None
    policy_id: Optional[str] = None
    cluster_json: dict
    default_libraries: list[dict] = Field(default_factory=list)
    is_default: bool = False


class ComputeProfileIn(ComputeProfileBase):
    pass


class ComputeProfileOut(ComputeProfileBase):
    id: int
    updated_at: Optional[dt.datetime] = None


class ComputeProfileUpdate(BaseModel):
    class Config:
        extra = "forbid"

    name: Optional[constr(strip_whitespace=True, min_length=1)] = None
    description: Optional[str] = None
    policy_id: Optional[str] = None
    cluster_json: Optional[dict] = None
    default_libraries: Optional[list[dict]] = None
    is_default: Optional[bool] = None
    updated_by: Optional[str] = None


# ---------- Group ----------
class GroupBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    description: Optional[str] = None
    is_enabled: bool = True
    is_raw: bool = False
    is_bronze: bool = False
    schedule_id: Optional[int] = None
    compute_profile_id: Optional[int] = None
    is_dlt: bool = False


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
    schedule_id: Optional[int] = None
    compute_profile_id: Optional[int] = None
    is_dlt: Optional[bool] = None


# ---------- Schedule ----------
class ScheduleBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    description: Optional[str] = None
    month_days: list[str] = []
    weekdays: list[int] = []
    times: list[str] = []
    is_enabled: bool = True

    @validator("weekdays", each_item=True)
    def weekday_range(cls, d):
        if d < 0 or d > 6:
            raise ValueError("weekday must be 0-6")
        return d

    @validator("month_days", each_item=True)
    def month_day_range(cls, d):
        if d.upper() != "L":
            if not d.isdigit() or int(d) < 1 or int(d) > 31:
                raise ValueError("month day must be 1-31 or 'L'")
        return d.upper()

    @validator("times", each_item=True)
    def time_format(cls, t):
        dt.time.fromisoformat(t)
        return t

    @root_validator(skip_on_failure=True)
    def exclusive(cls, values):
        if values.get("month_days") and values.get("weekdays"):
            raise ValueError("provide either month_days or weekdays, not both")
        return values


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
    month_days: Optional[list[str]] = None
    weekdays: Optional[list[int]] = None
    times: Optional[list[str]] = None
    is_enabled: Optional[bool] = None

    @validator("weekdays", each_item=True)
    def weekday_range(cls, d):
        if d < 0 or d > 6:
            raise ValueError("weekday must be 0-6")
        return d

    @validator("month_days", each_item=True)
    def month_day_range(cls, d):
        if d.upper() != "L":
            if not d.isdigit() or int(d) < 1 or int(d) > 31:
                raise ValueError("month day must be 1-31 or 'L'")
        return d.upper()

    @root_validator(skip_on_failure=True)
    def exclusive(cls, values):
        if values.get("month_days") and values.get("weekdays"):
            raise ValueError("provide either month_days or weekdays, not both")
        return values


# ---------- SourceSystem ----------
class SourceSystemBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    server: str
    description: Optional[str] = None
    type: Literal["adls", "databricks", "sql", "restapi"]


class SourceSystemIn(SourceSystemBase):
    pass


class SourceSystemOut(SourceSystemBase):
    id: int
    created_at: Optional[dt.datetime] = None


class SourceSystemUpdate(BaseModel):
    class Config:
        extra = "forbid"

    name: Optional[constr(strip_whitespace=True, min_length=1)] = None
    server: Optional[str] = None
    description: Optional[str] = None
    type: Optional[Literal["adls", "databricks", "sql", "restapi"]] = None
    updated_by: Optional[str] = None


# ---------- Connection ----------
class ConnectionBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    conn_type: Literal["jdbc", "adls", "s3", "restapi"]
    driver_class: Optional[str] = None
    endpoint_url: Optional[str] = None
    secret_scope: Optional[str] = None
    secret_key: Optional[str] = None
    options: dict = {}


class ConnectionIn(ConnectionBase):
    pass


class ConnectionOut(ConnectionBase):
    id: int
    updated_at: Optional[dt.datetime] = None


class ConnectionUpdate(BaseModel):
    class Config:
        extra = "forbid"

    name: Optional[constr(strip_whitespace=True, min_length=1)] = None
    conn_type: Optional[Literal["jdbc", "adls", "s3", "restapi"]] = None
    driver_class: Optional[str] = None
    endpoint_url: Optional[str] = None
    secret_scope: Optional[str] = None
    secret_key: Optional[str] = None
    options: Optional[dict] = None
    updated_by: Optional[str] = None
