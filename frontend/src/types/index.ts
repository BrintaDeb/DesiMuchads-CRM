export type UserRole = "SUPER_ADMIN" | "ACCOUNT_MANAGER" | "SPECIALIST" | "CLIENT";
export type WorkMode = "IN_OFFICE" | "REMOTE" | "CLIENT_SITE";
export type AttendanceStatus = "ACTIVE" | "ON_BREAK" | "COMPLETED" | "REGULARIZATION_NEEDED";
export type LeaveType = "CASUAL" | "SICK" | "EARNED" | "UNPAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ClientStatus = "LEAD" | "ONBOARDING" | "ACTIVE" | "PAUSED" | "CHURNED";
export type DealStage = "LEAD_CAPTURED" | "DISCOVERY_CALL" | "AUDIT_STRATEGY" | "PROPOSAL_SENT" | "WON" | "LOST";
export type ServiceType =
  | "SOCIAL_MEDIA_RETAINER"
  | "PERFORMANCE_MARKETING"
  | "WEB_BUILD"
  | "SEO_CONTENT"
  | "BRANDING"
  | "INFLUENCER_MARKETING"
  | "BRAND_IDENTITY_SPRINT"
  | "WHATSAPP_CRM"
  | "VIDEO_PRODUCTION";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus = "BACKLOG" | "BLOCKED" | "TODO" | "IN_PROGRESS" | "INTERNAL_QA" | "CLIENT_REVIEW" | "COMPLETED";
export type ContentPlatform = "INSTAGRAM" | "LINKEDIN" | "YOUTUBE" | "META_ADS" | "GOOGLE_ADS" | "BLOG_SEO";
export type ContentType = "REEL" | "CAROUSEL" | "STATIC" | "VIDEO" | "ARTICLE" | "STORY";
export type ContentApprovalStatus = "DRAFTING" | "INTERNAL_QA" | "CLIENT_REVIEW" | "APPROVED" | "REVISION_REQUESTED" | "PUBLISHED";
export type CalendarEventType = "MEETING" | "DEADLINE" | "CONTENT_DROP" | "LEAVE";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface User {
  id: string;
  employee_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  hourly_cost: number;
  weekly_capacity_hours: number;
  can_manage_automations?: boolean;
  can_edit_projects?: boolean;
  can_manage_billing?: boolean;
  permissions?: string[];
  is_active: boolean;
  created_at: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  permissions: PermissionItem[];
}

export interface PermissionPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  permissions: string[];
}

export interface PermissionMatrixResponse {
  modules: PermissionModule[];
  presets: PermissionPreset[];
  all_permissions: string[];
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  date: string;
  clock_in_at: string;
  clock_out_at?: string;
  break_start_at?: string;
  total_break_seconds: number;
  net_worked_seconds: number;
  work_mode: WorkMode;
  ip_address?: string;
  status: AttendanceStatus;
}

export interface LiveAttendanceBoardItem {
  user_id: string;
  full_name: string;
  department: string;
  role: UserRole;
  attendance_status: AttendanceStatus;
  work_mode: WorkMode;
  clock_in_at?: string;
  break_start_at?: string;
  net_worked_seconds: number;
  active_task_title?: string;
}

export interface Client {
  id: string;
  company_name: string;
  industry: string;
  primary_contact_name: string;
  contact_email: string;
  contact_phone?: string;
  retainer_amount: number;
  billing_cycle_day: number;
  gst_tax_id?: string;
  health_score: number;
  status: ClientStatus;
  deal_stage?: DealStage;
  deal_value: number;
  last_activity_at: string;
  account_manager_id?: string;
  created_at: string;
}

export interface Deal {
  id: string;
  company_name: string;
  industry: string;
  primary_contact_name: string;
  contact_email: string;
  contact_phone?: string;
  deal_stage?: DealStage;
  deal_value: number;
  retainer_amount: number;
  status: ClientStatus;
  health_score: number;
  last_activity_at: string;
  is_decaying: boolean;
  account_manager_id?: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  service_type: ServiceType;
  start_date: string;
  target_end_date: string;
  status: ProjectStatus;
  progress_percentage: number;
  created_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  project_id: string;
  parent_task_id?: string;
  depends_on_task_id?: string;
  title: string;
  description: string;
  assigned_to_id?: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_hours: number;
  logged_hours: number;
  due_at: string;
  completed_at?: string;
  created_at: string;
  assignee?: User;
  is_blocked?: boolean;
  blocking_dependency_title?: string;
}

export interface ContentCalendarItem {
  id: string;
  client_id: string;
  project_id?: string;
  task_id?: string;
  platform: ContentPlatform;
  content_type: ContentType;
  title: string;
  caption_copy: string;
  media_urls: string[];
  scheduled_for: string;
  approval_status: ContentApprovalStatus;
  internal_reviewer_id?: string;
  client_feedback?: string;
  version_number: number;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface MasterCalendarFeedItem {
  id: string;
  layer: "CONTENT" | "DEADLINE" | "MEETING" | "LEAVE";
  title: string;
  start: string;
  end: string;
  status?: string;
  client_name?: string;
  assigned_to_name?: string;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at?: string;
  stripe_payment_intent_id?: string;
  pdf_url?: string;
  created_at: string;
  client?: Client;
}

export interface VaultSecret {
  id: string;
  client_id: string;
  platform_name: string;
  username?: string;
  last_accessed_by_id?: string;
  updated_at: string;
  created_at: string;
  decrypted_secret?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: "MENTION" | "APPROVAL" | "SLA_WARNING" | "AUTOMATION" | string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    cursor?: string;
    has_more?: boolean;
    total_count?: number;
  };
  error?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_event: string;
  conditions?: Record<string, any>;
  action_type: string;
  action_config?: Record<string, any>;
  is_active: boolean;
  created_by_id?: string;
  created_at: string;
  last_triggered_at?: string;
  execution_count: number;
}

export interface DaemonStatus {
  id: string;
  name: string;
  description: string;
  schedule: string;
  is_active: boolean;
  last_run_at?: string;
  status: string;
}

export interface AutomationAuditLog {
  id: string;
  trigger_event: string;
  entity_type: string;
  entity_id: string;
  action_taken: string;
  executed_at: string;
  status: string;
  details?: Record<string, any>;
}

