import uuid
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Project, Client, WorkflowTemplate, WorkflowTemplateStep, User
from app.models.enums import UserRole, ProjectStatus, ServiceType
from app.schemas.schemas import (
    ApiResponse,
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    WorkflowTemplateCreate,
    WorkflowTemplateOut,
)

router = APIRouter(prefix="/projects", tags=["Projects & Workflow Blueprints"])


@router.get("/", response_model=ApiResponse[List[ProjectOut]])
async def list_projects(
    client_id: Optional[uuid.UUID] = None,
    status_filter: Optional[ProjectStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Project).options(selectinload(Project.client)).where(Project.deleted_at.is_(None))

    if current_user.role == UserRole.CLIENT:
        # Filter for only client's projects
        query = query.join(Client).where(Client.contact_email == current_user.email)
    elif client_id:
        query = query.where(Project.client_id == client_id)

    if status_filter:
        query = query.where(Project.status == status_filter)

    query = query.order_by(Project.created_at.desc())
    res = await db.execute(query)
    projects = res.scalars().all()
    return ApiResponse(data=[ProjectOut.model_validate(p) for p in projects])


@router.post("/", response_model=ApiResponse[ProjectOut])
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        client_id=data.client_id,
        name=data.name,
        service_type=data.service_type,
        start_date=data.start_date,
        target_end_date=data.target_end_date,
        status=ProjectStatus.PLANNING,
        progress_percentage=0.0,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ApiResponse(data=ProjectOut.model_validate(project))


@router.patch("/{id}", response_model=ApiResponse[ProjectOut])
async def update_project(
    id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Project).where(Project.id == id, Project.deleted_at.is_(None))
    res = await db.execute(query)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(project, k, v)

    await db.commit()
    await db.refresh(project)
    return ApiResponse(data=ProjectOut.model_validate(project))


# Blueprint Templates
@router.get("/templates", response_model=ApiResponse[List[WorkflowTemplateOut]])
async def list_workflow_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(WorkflowTemplate).options(selectinload(WorkflowTemplate.steps)).order_by(WorkflowTemplate.created_at.desc())
    res = await db.execute(query)
    templates = res.scalars().all()
    return ApiResponse(data=[WorkflowTemplateOut.model_validate(t) for t in templates])


@router.post("/templates", response_model=ApiResponse[WorkflowTemplateOut])
async def create_workflow_template(
    data: WorkflowTemplateCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    template = WorkflowTemplate(
        name=data.name,
        service_type=data.service_type,
        description=data.description,
    )
    db.add(template)
    await db.flush()

    for step_data in data.steps:
        step = WorkflowTemplateStep(
            template_id=template.id,
            step_order=step_data.step_order,
            title=step_data.title,
            description=step_data.description,
            default_role=step_data.default_role,
            relative_due_days=step_data.relative_due_days,
            estimated_hours=step_data.estimated_hours,
            dependency_step_order=step_data.dependency_step_order,
        )
        db.add(step)

    await db.commit()
    # Reload with steps
    res = await db.execute(select(WorkflowTemplate).options(selectinload(WorkflowTemplate.steps)).where(WorkflowTemplate.id == template.id))
    reloaded = res.scalar_one()
    return ApiResponse(data=WorkflowTemplateOut.model_validate(reloaded))

