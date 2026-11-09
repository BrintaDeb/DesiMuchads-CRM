import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Generic, TypeVar
import json
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from app.models.enums import (
    UserRole,
    WorkMode,
    AttendanceStatus,
    LeaveType,
    LeaveStatus,
    ClientStatus,
    DealStage,
    ServiceType,
    ProjectStatus,
    TaskPriority,
    TaskStatus,
    ContentPlatform,
    ContentType,
    ContentApprovalStatus,
    CalendarEventType,
    InvoiceStatus,
)

T = TypeVar("T")


# ==============================================================================
# ENVELOPE & PAGINATION SCHEMAS
# ==============================================================================

class ResponseMeta(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    cursor: Optional[str] = None
    has_more: bool = False
    total_count: Optional[int] = None


class ApiResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
    error: Optional[str] = None


# ==============================================================================
# AUTH & SESSION SCHEMAS
# ==============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserSessionOut(BaseModel):
    id: uuid.UUID
    device_name: str
    ip_address: Optional[str] = None
    last_active_at: datetime
    created_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# USER SCHEMAS
# ==============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.SPECIALIST
    department: str = "Digital Marketing"
    hourly_cost: float = 35.0
    weekly_capacity_hours: int = 40
    can_manage_automations: bool = False
    can_edit_projects: bool = True
    can_manage_billing: bool = False
    permissions: Optional[List[str]] = Field(default_factory=list)
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    hourly_cost: Optional[float] = None
    weekly_capacity_hours: Optional[int] = None
    can_manage_automations: Optional[bool] = None
    can_edit_projects: Optional[bool] = None
    can_manage_billing: Optional[bool] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserPermissionsUpdate(BaseModel):
    permissions: List[str]


class PermissionItem(BaseModel):
    id: str
    name: str
    description: str


class PermissionModule(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    permissions: List[PermissionItem]


class PermissionPreset(BaseModel):
    id: str
    name: str
    badge: str
    description: str
    permissions: List[str]


class PermissionMatrixResponse(BaseModel):
    modules: List[PermissionModule]
    presets: List[PermissionPreset]
    all_permissions: List[str]


class UserOut(UserBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# ATTENDANCE & LEAVE SCHEMAS
# ==============================================================================

class ClockInRequest(BaseModel):
    work_mode: WorkMode = WorkMode.IN_OFFICE
    ip_address: Optional[str] = None


class BreakToggleRequest(BaseModel):
    action: str = Field(..., description="'start' or 'resume'")


class ClockOutRequest(BaseModel):
    notes: Optional[str] = None


class AttendanceLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    clock_in_at: datetime
    clock_out_at: Optional[datetime] = None
    break_start_at: Optional[datetime] = None
    total_break_seconds: int
    net_worked_seconds: int
    work_mode: WorkMode
    ip_address: Optional[str] = None
    status: AttendanceStatus
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


class LiveAttendanceBoardItem(BaseModel):
    user_id: uuid.UUID
    full_name: str
    department: str
    role: UserRole
    attendance_status: AttendanceStatus
    work_mode: WorkMode
    clock_in_at: Optional[datetime] = None
    break_start_at: Optional[datetime] = None
    net_worked_seconds: int
    active_task_title: Optional[str] = None


class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str


class LeaveRequestReview(BaseModel):
    status: LeaveStatus = Field(..., description="APPROVED or REJECTED")


class LeaveRequestOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    approved_by_id: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# CLIENT & CRM SCHEMAS
# ==============================================================================

class ClientBase(BaseModel):
    company_name: str
    industry: str = "Digital Commerce"
    primary_contact_name: str
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    retainer_amount: float = 0.0
    billing_cycle_day: int = Field(default=1, ge=1, le=31)
    gst_tax_id: Optional[str] = None
    account_manager_id: Optional[uuid.UUID] = None


class ClientCreate(ClientBase):
    deal_stage: Optional[DealStage] = DealStage.LEAD_CAPTURED
    deal_value: float = 0.0


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    primary_contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    retainer_amount: Optional[float] = None
    billing_cycle_day: Optional[int] = Field(default=None, ge=1, le=31)
    gst_tax_id: Optional[str] = None
    health_score: Optional[int] = Field(default=None, ge=0, le=100)
    status: Optional[ClientStatus] = None
    deal_stage: Optional[DealStage] = None
    deal_value: Optional[float] = None
    account_manager_id: Optional[uuid.UUID] = None


class DealConvertToClientRequest(BaseModel):
    service_blueprint_ids: List[uuid.UUID] = Field(default_factory=list)
    initial_retainer: Optional[float] = None
    billing_cycle_day: int = 1
    generate_deposit_invoice: bool = True


class GenerateProposalRequest(BaseModel):
    objective: Optional[str] = None
    target_platforms: Optional[List[str]] = Field(default_factory=list)
    custom_notes: Optional[str] = None


class ClientOut(ClientBase):
    id: uuid.UUID
    health_score: int
    status: ClientStatus
    deal_stage: Optional[DealStage] = None
    deal_value: float
    last_activity_at: datetime
    created_at: datetime
    account_manager: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# VAULT SECRET SCHEMAS
# ==============================================================================

class VaultSecretCreate(BaseModel):
    platform_name: str = Field(..., json_schema_extra={"example": "Meta Ads Access Token"})
    username: Optional[str] = None
    secret_value: str = Field(..., min_length=1)


class VaultSecretOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    platform_name: str
    username: Optional[str] = None
    last_accessed_by_id: Optional[uuid.UUID] = None
    updated_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VaultSecretDecryptedOut(VaultSecretOut):
    decrypted_secret: str


# ==============================================================================
# WORKFLOW TEMPLATE & BLUEPRINT SCHEMAS
# ==============================================================================

class WorkflowTemplateStepBase(BaseModel):
    step_order: int
    title: str
    description: str
    default_role: UserRole = UserRole.SPECIALIST
    relative_due_days: int = 3
    estimated_hours: float = 4.0
    dependency_step_order: Optional[int] = None


class WorkflowTemplateStepCreate(WorkflowTemplateStepBase):
    pass


class WorkflowTemplateStepOut(WorkflowTemplateStepBase):
    id: uuid.UUID
    template_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class WorkflowTemplateCreate(BaseModel):
    name: str
    service_type: ServiceType
    description: str
    steps: List[WorkflowTemplateStepCreate] = Field(default_factory=list)


class WorkflowTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    service_type: ServiceType
    description: str
    steps: List[WorkflowTemplateStepOut] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# PROJECT & TASK (DAG) SCHEMAS
# ==============================================================================

class ProjectCreate(BaseModel):
    client_id: uuid.UUID
    name: str
    service_type: ServiceType
    start_date: date = Field(default_factory=date.today)
    target_end_date: date


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[ProjectStatus] = None
    progress_percentage: Optional[float] = None
    target_end_date: Optional[date] = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    service_type: ServiceType
    start_date: date
    target_end_date: date
    status: ProjectStatus
    progress_percentage: float
    created_at: datetime
    client: Optional[ClientOut] = None

    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    title: str
    description: str = ""
    assigned_to_id: Optional[uuid.UUID] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    estimated_hours: float = 2.0
    due_at: datetime
    depends_on_task_id: Optional[uuid.UUID] = None


class TaskCreate(TaskBase):
    project_id: uuid.UUID
    parent_task_id: Optional[uuid.UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    estimated_hours: Optional[float] = None
    logged_hours: Optional[float] = None
    due_at: Optional[datetime] = None
    depends_on_task_id: Optional[uuid.UUID] = None


class TaskTransitionRequest(BaseModel):
    new_status: TaskStatus
    notes: Optional[str] = None


class TimeLogRequest(BaseModel):
    hours_to_add: float = Field(..., gt=0.0)
    notes: Optional[str] = None


class TaskOut(TaskBase):
    id: uuid.UUID
    project_id: uuid.UUID
    parent_task_id: Optional[uuid.UUID] = None
    status: TaskStatus
    logged_hours: float
    completed_at: Optional[datetime] = None
    created_at: datetime
    assignee: Optional[UserOut] = None
    is_blocked: bool = False
    blocking_dependency_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# CONTENT CALENDAR SCHEMAS (TWO-TIER APPROVAL)
# ==============================================================================

class ContentItemCreate(BaseModel):
    client_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    task_id: Optional[uuid.UUID] = None
    platform: ContentPlatform
    content_type: ContentType
    title: str
    caption_copy: str = ""
    media_urls: List[str] = Field(default_factory=list)
    scheduled_for: datetime


class ContentItemUpdate(BaseModel):
    platform: Optional[ContentPlatform] = None
    content_type: Optional[ContentType] = None
    title: Optional[str] = None
    caption_copy: Optional[str] = None
    media_urls: Optional[List[str]] = None
    scheduled_for: Optional[datetime] = None


class SubmitForApprovalRequest(BaseModel):
    target_tier: str = Field(..., description="'INTERNAL_QA' or 'CLIENT_REVIEW'")
    notes: Optional[str] = None


class ClientDecisionRequest(BaseModel):
    decision: str = Field(..., description="'APPROVED' or 'REVISION_REQUESTED'")
    feedback: Optional[str] = None


class ContentItemOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    task_id: Optional[uuid.UUID] = None
    platform: ContentPlatform
    content_type: ContentType
    title: str
    caption_copy: str
    media_urls: List[str]
    scheduled_for: datetime
    approval_status: ContentApprovalStatus
    internal_reviewer_id: Optional[uuid.UUID] = None
    client_feedback: Optional[str] = None
    version_number: int
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None

    @field_validator("media_urls", mode="before")
    @classmethod
    def parse_media_urls(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [v] if v else []
        return v or []

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# CALENDAR EVENT SCHEMAS (MASTER CALENDAR 4 LAYERS)
# ==============================================================================

class CalendarEventCreate(BaseModel):
    title: str
    event_type: CalendarEventType
    start_time: datetime
    end_time: datetime
    client_id: Optional[uuid.UUID] = None
    attendees: List[str] = Field(default_factory=list)
    meeting_link: Optional[str] = None


class CalendarEventOut(BaseModel):
    id: uuid.UUID
    title: str
    event_type: CalendarEventType
    start_time: datetime
    end_time: datetime
    client_id: Optional[uuid.UUID] = None
    created_by_id: uuid.UUID
    attendees: List[str]
    meeting_link: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MasterCalendarFeedItem(BaseModel):
    id: str
    layer: str = Field(..., description="'CONTENT', 'DEADLINE', 'MEETING', 'LEAVE'")
    title: str
    start: datetime
    end: datetime
    status: Optional[str] = None
    client_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# INVOICE & BILLING SCHEMAS
# ==============================================================================

class InvoiceCreate(BaseModel):
    client_id: uuid.UUID
    subtotal: float = Field(..., gt=0.0)
    tax_percentage: float = 18.0  # Default Indian GST 18%
    currency: str = "INR"
    due_date: date


class InvoiceOut(BaseModel):
    id: uuid.UUID
    invoice_number: str
    client_id: uuid.UUID
    subtotal: float
    tax_amount: float
    total_amount: float
    currency: str
    status: InvoiceStatus
    due_date: date
    paid_at: Optional[datetime] = None
    stripe_payment_intent_id: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: datetime
    client: Optional[ClientOut] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# NOTIFICATION & AUDIT SCHEMAS
# ==============================================================================

class NotificationOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    category: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AutomationAuditLogOut(BaseModel):
    id: uuid.UUID
    trigger_event: str
    entity_type: str
    entity_id: uuid.UUID
    action_taken: str
    executed_at: datetime
    status: str
    details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class AutomationRuleBase(BaseModel):
    name: str
    description: str = ""
    trigger_event: str
    conditions: Optional[Dict[str, Any]] = None
    action_type: str
    action_config: Optional[Dict[str, Any]] = None
    is_active: bool = True


class AutomationRuleCreate(AutomationRuleBase):
    pass


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_event: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    action_type: Optional[str] = None
    action_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AutomationRuleOut(AutomationRuleBase):
    id: uuid.UUID
    created_by_id: Optional[uuid.UUID] = None
    created_at: datetime
    last_triggered_at: Optional[datetime] = None
    execution_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class DaemonStatusOut(BaseModel):
    id: str
    name: str
    description: str
    schedule: str
    is_active: bool
    last_run_at: Optional[datetime] = None
    status: str = "HEALTHY"


# ==============================================================================
# AI AUTOMATION LAYER SCHEMAS
# ==============================================================================

class CampaignBriefRequest(BaseModel):
    client_id: uuid.UUID
    campaign_objective: str
    target_audience: str
    budget: float
    platforms: List[str]


class ContentIdeationRequest(BaseModel):
    client_id: uuid.UUID
    industry: str
    month: str
    pillar: str


class StandupDigestRequest(BaseModel):
    department: Optional[str] = None


# ==============================================================================
# AUTONOMOUS AREA LEAD GENERATION & COLD OUTREACH SCHEMAS
# ==============================================================================

class DiscoveredLeadItem(BaseModel):
    temp_id: str
    company_name: str
    founder_name: str
    title: str
    email: str
    phone: str
    city: str
    area: str
    locality: str
    public_landmark: Optional[str] = None
    nearby_landmark: Optional[str] = None
    google_maps_url: Optional[str] = None
    google_maps_place_id: Optional[str] = None
    google_rating: Optional[float] = 4.7
    review_count: Optional[int] = 128
    google_3pack_status: Optional[str] = "Rank #1-3 in Local 3-Pack"
    niche: str
    deal_value: float
    intent_score: int
    lead_temperature: str = "HOT_BUYER"  # "HOT_BUYER", "WARM_PROSPECT", "OPPORTUNITY"
    audit_findings: List[str]
    buying_triggers: List[str] = []
    buyer_persona: str = ""
    annual_revenue_band: str = "₹2 Cr - ₹5 Cr ARR"
    employee_count_band: str = "15-50 Employees"
    website_url: Optional[str] = None
    website_speed_status: Optional[str] = "Needs Mobile Optimization (3.8s LCP)"
    tech_stack: List[str] = []
    recommended_service: str
    latitude: float = 18.9284
    longitude: float = 72.8282
    distance_km: float = 0.5
    distance_label: str = "0.5 km away"
    pinpoint_address: str = ""
    linkedin_url: Optional[str] = None
    cold_email_subject: str
    cold_email_body: str
    cold_whatsapp_text: str
    whatsapp_click_url: str
    cold_phone_call_script: Optional[str] = None


class LeadDiscoveryRequest(BaseModel):
    city: str = "Mumbai"
    area: str = "South Mumbai"
    niche: str = "Graphic Designing & Brand Identity"
    target_count: int = Field(default=6, ge=1, le=15)
    min_deal_value: Optional[float] = 50000.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = Field(default=5.0, ge=0.5, le=50.0)
    pinpoint_landmark: Optional[str] = None
    lead_temperature_filter: Optional[str] = "ALL"  # "ALL", "HOT_BUYER", "WARM_PROSPECT"


class LeadOutreachGenerateRequest(BaseModel):
    company_name: str
    founder_name: str
    niche: str
    city: str
    area: str
    primary_pain_point: Optional[str] = None


class LeadInjectBatchRequest(BaseModel):
    leads: List[DiscoveredLeadItem]
    stage: DealStage = DealStage.LEAD_CAPTURED
    auto_dispatch_first_touch: bool = False


class LeadDispatchBatchRequest(BaseModel):
    lead_ids: Optional[List[str]] = None
    leads: Optional[List[DiscoveredLeadItem]] = None
    channel: str = "ALL"  # "EMAIL", "WHATSAPP", "ALL"

