from typing import List, Dict, Any, Optional
from app.models.enums import UserRole

# Canonical Permission Matrix
ALL_MODULES = [
    {
        "id": "crm",
        "name": "Sales CRM & Deals Pipeline",
        "icon": "Users",
        "description": "Client roster, deals pipeline, Kanban stage movements, lead contacts",
        "permissions": [
            {"id": "crm:read", "name": "View Deals & Pipeline", "description": "View CRM deals, client cards, and pipeline stages"},
            {"id": "crm:write", "name": "Manage Deals & Pipeline", "description": "Create, edit deals, move stages, and log interactions"},
        ],
    },
    {
        "id": "leads",
        "name": "AI Lead Engine & Radar",
        "icon": "Zap",
        "description": "Google Maps Radar discovery, nearby landmark radius search, AI buyer dossiers, 1-click CRM injection",
        "permissions": [
            {"id": "leads:read", "name": "View Lead Radar & Discovery", "description": "Access Maps Radar, search local business prospects, view dossiers"},
            {"id": "leads:write", "name": "Inject Leads & Trigger Outreach", "description": "Directly inject discovered leads to CRM pipeline and launch outreach sequences"},
        ],
    },
    {
        "id": "projects",
        "name": "Projects & DAG Tasks",
        "icon": "KanbanSquare",
        "description": "DAG task graphs, milestone deadlines, task assignments, Kanban boards",
        "permissions": [
            {"id": "projects:read", "name": "View Projects & Tasks", "description": "View task board, project status, and timelines"},
            {"id": "projects:write", "name": "Create & Edit Tasks", "description": "Assign team members, adjust deadlines, update task stages"},
        ],
    },
    {
        "id": "content",
        "name": "Content Approvals & Calendar",
        "icon": "CheckSquare",
        "description": "Social media post calendar, two-tier approval machine, revision requests",
        "permissions": [
            {"id": "content:read", "name": "View Content Calendar", "description": "View scheduled posts, drafts, and channel calendars"},
            {"id": "content:write", "name": "Review & Approve Content", "description": "Upload creatives, submit for client review, grant sign-offs"},
        ],
    },
    {
        "id": "attendance",
        "name": "Workforce & Attendance",
        "icon": "Clock",
        "description": "Biometric punch clock, break times, shift logs, leave management",
        "permissions": [
            {"id": "attendance:read", "name": "View Punch Terminal & Presence", "description": "Access time terminal and view team presence board"},
            {"id": "attendance:write", "name": "Clock Operations & Regularization", "description": "Punch in/out, log breaks, request leave or regularizations"},
        ],
    },
    {
        "id": "billing",
        "name": "Invoicing & GST Ledger",
        "icon": "Receipt",
        "description": "Indian GST invoices (18%), SAC codes, Razorpay/UPI links, payment reconciliation",
        "permissions": [
            {"id": "billing:read", "name": "View Invoices & Ledgers", "description": "View issued invoices, GST breakdowns, and payment statuses"},
            {"id": "billing:write", "name": "Generate Invoices & Collect Payments", "description": "Issue GST invoices, record payments, and dispatch UPI links"},
        ],
    },
    {
        "id": "vault",
        "name": "Brand Vault & Secrets",
        "icon": "ShieldCheck",
        "description": "Fernet AES-256 encrypted ad account credentials, Shopify tokens, brand assets",
        "permissions": [
            {"id": "vault:read", "name": "View Brand Assets & Credentials", "description": "Read ad account IDs, color palettes, and social credentials"},
            {"id": "vault:write", "name": "Manage Secrets & API Keys", "description": "Create, rotate, and update client ad credentials and tokens"},
        ],
    },
    {
        "id": "automations",
        "name": "Automation Engine & Daemons",
        "icon": "Sparkles",
        "description": "Background daemons, SLA auto-escalators, automated follow-ups, DAG cascading rules",
        "permissions": [
            {"id": "automations:read", "name": "View Running Automations", "description": "Inspect daemon statuses, execution history, and trigger logs"},
            {"id": "automations:write", "name": "Manage & Edit Automations", "description": "Configure rules, toggle daemons, and create custom webhook triggers"},
        ],
    },
    {
        "id": "team",
        "name": "Team & Access Control",
        "icon": "Shield",
        "description": "Workforce directory, provision member logins, and assign software module permissions",
        "permissions": [
            {"id": "team:read", "name": "View Team Directory", "description": "View agency staff roster, roles, and departments"},
            {"id": "team:write", "name": "Assign Permissions & Manage Users", "description": "Provision members, edit roles, and assign module permissions"},
        ],
    },
]

# Flattened list of all canonical permission IDs
ALL_PERMISSION_IDS = [
    perm["id"]
    for module in ALL_MODULES
    for perm in module["permissions"]
]

# Pre-configured Presets for 1-Click Assignment
PERMISSION_PRESETS = [
    {
        "id": "super_admin",
        "name": "Full Access (Super Admin)",
        "badge": "Root Access",
        "description": "Complete unrestricted administrative control across every module of DesiMuchads CRM",
        "permissions": ALL_PERMISSION_IDS,
    },
    {
        "id": "sales_hunter",
        "name": "Sales & Lead Hunter",
        "badge": "Growth & Deals",
        "description": "Focused on customer acquisition: CRM pipeline, AI Lead Engine Maps Radar, and outreach",
        "permissions": [
            "crm:read",
            "crm:write",
            "leads:read",
            "leads:write",
            "projects:read",
            "attendance:read",
            "attendance:write",
        ],
    },
    {
        "id": "creative_specialist",
        "name": "Creative & Media Specialist",
        "badge": "Content & Assets",
        "description": "Focused on deliverables: Projects & tasks, Content Approvals calendar, and Brand Vault assets",
        "permissions": [
            "projects:read",
            "projects:write",
            "content:read",
            "content:write",
            "vault:read",
            "attendance:read",
            "attendance:write",
        ],
    },
    {
        "id": "account_manager",
        "name": "Account Manager",
        "badge": "Client Operations",
        "description": "Client relationship lead: CRM, Projects, Content Reviews, and Billing/GST invoices",
        "permissions": [
            "crm:read",
            "crm:write",
            "leads:read",
            "projects:read",
            "projects:write",
            "content:read",
            "content:write",
            "billing:read",
            "billing:write",
            "vault:read",
            "attendance:read",
            "attendance:write",
            "team:read",
        ],
    },
    {
        "id": "staff_member",
        "name": "Standard Staff / Clock Only",
        "badge": "Presence & Tasks",
        "description": "Core workforce member: Punch clock terminal, leave logging, and assigned tasks view",
        "permissions": [
            "attendance:read",
            "attendance:write",
            "projects:read",
        ],
    },
    {
        "id": "read_only",
        "name": "Read-Only Auditor",
        "badge": "View Only",
        "description": "Read-only access across CRM, Leads, Projects, Content, Invoices, and Team roster",
        "permissions": [
            "crm:read",
            "leads:read",
            "projects:read",
            "content:read",
            "attendance:read",
            "billing:read",
            "vault:read",
            "automations:read",
            "team:read",
        ],
    },
]


def get_default_permissions_for_role(
    role: UserRole,
    can_manage_automations: bool = False,
    can_edit_projects: bool = True,
    can_manage_billing: bool = False,
) -> List[str]:
    """
    Returns reasonable default permissions based on user role and legacy flags
    if explicit permissions list has not yet been assigned by Super Admin.
    """
    if role == UserRole.SUPER_ADMIN:
        return list(ALL_PERMISSION_IDS)

    perms = set()

    # Core baseline
    perms.add("attendance:read")
    perms.add("attendance:write")

    if role == UserRole.ACCOUNT_MANAGER:
        perms.update([
            "crm:read",
            "crm:write",
            "leads:read",
            "projects:read",
            "projects:write",
            "content:read",
            "content:write",
            "vault:read",
            "team:read",
        ])
    elif role == UserRole.SPECIALIST:
        perms.update([
            "projects:read",
            "content:read",
            "content:write",
            "vault:read",
        ])
        if can_edit_projects:
            perms.add("projects:write")
    elif role == UserRole.CLIENT:
        perms.update([
            "projects:read",
            "content:read",
            "content:write",
        ])

    # Respect explicit boolean flags
    if can_manage_automations:
        perms.add("automations:read")
        perms.add("automations:write")
        perms.add("leads:read")
        perms.add("leads:write")

    if can_manage_billing:
        perms.add("billing:read")
        perms.add("billing:write")

    return sorted(list(perms))
