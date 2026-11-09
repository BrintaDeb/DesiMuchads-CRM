import uuid
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import (
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    Date,
    ForeignKey,
    Text,
    LargeBinary,
    Index,
    JSON,
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
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


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", native_enum=False),
        default=UserRole.SPECIALIST,
        nullable=False,
    )
    department: Mapped[str] = mapped_column(String(100), default="Digital Marketing", nullable=False)
    hourly_cost: Mapped[float] = mapped_column(Float, default=35.0, nullable=False)
    weekly_capacity_hours: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    can_manage_automations: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_edit_projects: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_manage_billing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    attendance_records: Mapped[List["AttendanceLog"]] = relationship("AttendanceLog", back_populates="user")
    leave_requests: Mapped[List["LeaveRequest"]] = relationship("LeaveRequest", back_populates="user", foreign_keys="LeaveRequest.user_id")
    assigned_tasks: Mapped[List["Task"]] = relationship("Task", back_populates="assignee")
    managed_clients: Mapped[List["Client"]] = relationship("Client", back_populates="account_manager")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False, index=True)
    clock_in_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    clock_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    break_start_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_break_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    net_worked_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    work_mode: Mapped[WorkMode] = mapped_column(
        SAEnum(WorkMode, name="work_mode", native_enum=False),
        default=WorkMode.IN_OFFICE,
        nullable=False,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus, name="attendance_status", native_enum=False),
        default=AttendanceStatus.ACTIVE,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="attendance_records")

    __table_args__ = (
        Index("ix_attendance_user_date", "user_id", "date"),
    )


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type: Mapped[LeaveType] = mapped_column(
        SAEnum(LeaveType, name="leave_type", native_enum=False),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[LeaveStatus] = mapped_column(
        SAEnum(LeaveStatus, name="leave_status", native_enum=False),
        default=LeaveStatus.PENDING,
        nullable=False,
    )
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="leave_requests")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])

    __table_args__ = (
        Index("ix_leave_dates_status", "start_date", "end_date", "status"),
    )


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    industry: Mapped[str] = mapped_column(String(100), default="Digital Commerce", nullable=False)
    primary_contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    retainer_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    billing_cycle_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    gst_tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    health_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    status: Mapped[ClientStatus] = mapped_column(
        SAEnum(ClientStatus, name="client_status", native_enum=False),
        default=ClientStatus.LEAD,
        nullable=False,
    )
    deal_stage: Mapped[Optional[DealStage]] = mapped_column(
        SAEnum(DealStage, name="deal_stage", native_enum=False),
        default=DealStage.LEAD_CAPTURED,
        nullable=True,
    )
    deal_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    account_manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    account_manager: Mapped[Optional["User"]] = relationship("User", back_populates="managed_clients")
    vault_secrets: Mapped[List["ClientVaultSecret"]] = relationship("ClientVaultSecret", back_populates="client", cascade="all, delete-orphan")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="client", cascade="all, delete-orphan")
    invoices: Mapped[List["Invoice"]] = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")
    content_items: Mapped[List["ContentCalendarItem"]] = relationship("ContentCalendarItem", back_populates="client")

    __table_args__ = (
        Index("ix_clients_status_cycle", "status", "billing_cycle_day"),
        Index("ix_clients_deal_stage_activity", "deal_stage", "last_activity_at"),
    )


class ClientVaultSecret(Base):
    __tablename__ = "client_vault_secrets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    platform_name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    encrypted_secret: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    last_accessed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    client: Mapped["Client"] = relationship("Client", back_populates="vault_secrets")
    last_accessed_by: Mapped[Optional["User"]] = relationship("User")


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    service_type: Mapped[ServiceType] = mapped_column(
        SAEnum(ServiceType, name="service_type", native_enum=False),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    steps: Mapped[List["WorkflowTemplateStep"]] = relationship("WorkflowTemplateStep", back_populates="template", cascade="all, delete-orphan")


class WorkflowTemplateStep(Base):
    __tablename__ = "workflow_template_steps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    default_role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="step_user_role", native_enum=False),
        default=UserRole.SPECIALIST,
        nullable=False,
    )
    relative_due_days: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    estimated_hours: Mapped[float] = mapped_column(Float, default=4.0, nullable=False)
    dependency_step_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    template: Mapped["WorkflowTemplate"] = relationship("WorkflowTemplate", back_populates="steps")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    service_type: Mapped[ServiceType] = mapped_column(
        SAEnum(ServiceType, name="project_service_type", native_enum=False),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    target_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, name="project_status", native_enum=False),
        default=ProjectStatus.PLANNING,
        nullable=False,
    )
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    client: Mapped["Client"] = relationship("Client", back_populates="projects")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_task_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    depends_on_task_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(TaskPriority, name="task_priority", native_enum=False),
        default=TaskPriority.MEDIUM,
        nullable=False,
    )
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status", native_enum=False),
        default=TaskStatus.TODO,
        nullable=False,
    )
    estimated_hours: Mapped[float] = mapped_column(Float, default=2.0, nullable=False)
    logged_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    assignee: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_tasks")
    parent_task: Mapped[Optional["Task"]] = relationship("Task", remote_side=[id], foreign_keys=[parent_task_id])
    depends_on_task: Mapped[Optional["Task"]] = relationship("Task", remote_side=[id], foreign_keys=[depends_on_task_id])

    __table_args__ = (
        Index("ix_tasks_project_status_due", "project_id", "status", "due_at"),
        Index("ix_tasks_assigned_status", "assigned_to_id", "status"),
    )


class ContentCalendarItem(Base):
    __tablename__ = "content_calendar_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    platform: Mapped[ContentPlatform] = mapped_column(
        SAEnum(ContentPlatform, name="content_platform", native_enum=False),
        nullable=False,
    )
    content_type: Mapped[ContentType] = mapped_column(
        SAEnum(ContentType, name="content_type", native_enum=False),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    caption_copy: Mapped[str] = mapped_column(Text, default="", nullable=False)
    media_urls: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    approval_status: Mapped[ContentApprovalStatus] = mapped_column(
        SAEnum(ContentApprovalStatus, name="content_approval_status", native_enum=False),
        default=ContentApprovalStatus.DRAFTING,
        nullable=False,
    )
    internal_reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    client: Mapped["Client"] = relationship("Client", back_populates="content_items")
    internal_reviewer: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        Index("ix_content_client_scheduled", "client_id", "scheduled_for"),
        Index("ix_content_approval_status", "approval_status"),
    )


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[CalendarEventType] = mapped_column(
        SAEnum(CalendarEventType, name="calendar_event_type", native_enum=False),
        nullable=False,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    attendees: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    meeting_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    created_by: Mapped["User"] = relationship("User")
    client: Mapped[Optional["Client"]] = relationship("Client")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 18% GST
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        SAEnum(InvoiceStatus, name="invoice_status", native_enum=False),
        default=InvoiceStatus.DRAFT,
        nullable=False,
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    client: Mapped["Client"] = relationship("Client", back_populates="invoices")

    __table_args__ = (
        Index("ix_invoices_client_status_due", "client_id", "status", "due_date"),
    )


class AutomationAuditLog(Base):
    __tablename__ = "automation_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trigger_event: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS", nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    trigger_event: Mapped[str] = mapped_column(String(100), nullable=False)
    conditions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    action_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    execution_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="SYSTEM", nullable=False)  # MENTION, APPROVAL, SLA_WARNING, AUTOMATION
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="notifications")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_jti: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    device_name: Mapped[str] = mapped_column(String(100), default="Desktop Browser", nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


