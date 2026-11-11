import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Task, Project, User
from app.models.enums import UserRole, TaskStatus, TaskPriority
from app.schemas.schemas import (
    ApiResponse,
    TaskCreate,
    TaskUpdate,
    TaskTransitionRequest,
    TimeLogRequest,
    TaskOut,
)
from app.services.dag_engine import dag_engine
from app.services.automation_bus import automation_bus
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/tasks", tags=["DAG Project Tasks & Kanban State Machine"])


@router.get("/", response_model=ApiResponse[List[TaskOut]])
async def list_tasks(
    project_id: Optional[uuid.UUID] = None,
    assigned_to_id: Optional[uuid.UUID] = None,
    status_filter: Optional[TaskStatus] = None,
    priority_filter: Optional[TaskPriority] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).options(selectinload(Task.assignee), selectinload(Task.depends_on_task)).where(Task.deleted_at.is_(None))

    if current_user.role == UserRole.SPECIALIST:
        # Specialists see their own tasks or project-scoped tasks
        query = query.where(Task.assigned_to_id == current_user.id)
    elif assigned_to_id:
        query = query.where(Task.assigned_to_id == assigned_to_id)

    if project_id:
        query = query.where(Task.project_id == project_id)
    if status_filter:
        query = query.where(Task.status == status_filter)
    if priority_filter:
        query = query.where(Task.priority == priority_filter)

    query = query.order_by(Task.due_at.asc())
    res = await db.execute(query)
    tasks = res.scalars().all()

    output = []
    for t in tasks:
        t_out = TaskOut.model_validate(t)
        # Check if blocked by incomplete dependency
        if t.depends_on_task:
            if t.depends_on_task.status != TaskStatus.COMPLETED:
                t_out.is_blocked = True
                t_out.blocking_dependency_title = t.depends_on_task.title
        output.append(t_out)

    return ApiResponse(data=output)


@router.post("/", response_model=ApiResponse[TaskOut])
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    proj_query = select(Project).where(Project.id == data.project_id, Project.deleted_at.is_(None))
    p_res = await db.execute(proj_query)
    if not p_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Target project not found.")

    initial_status = TaskStatus.TODO
    # Check DAG dependency
    if data.depends_on_task_id:
        dep_query = select(Task).where(Task.id == data.depends_on_task_id)
        dep_res = await db.execute(dep_query)
        dep_task = dep_res.scalar_one_or_none()
        if not dep_task:
            raise HTTPException(status_code=400, detail="Invalid dependency task ID.")
        if dep_task.status != TaskStatus.COMPLETED:
            initial_status = TaskStatus.BLOCKED

    task = Task(
        project_id=data.project_id,
        parent_task_id=data.parent_task_id,
        depends_on_task_id=data.depends_on_task_id,
        title=data.title,
        description=data.description,
        assigned_to_id=data.assigned_to_id,
        priority=data.priority,
        status=initial_status,
        estimated_hours=data.estimated_hours,
        logged_hours=0.0,
        due_at=data.due_at,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return ApiResponse(data=TaskOut.model_validate(task))


@router.patch("/{id}", response_model=ApiResponse[TaskOut])
async def update_task(
    id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).options(selectinload(Task.depends_on_task)).where(Task.id == id, Task.deleted_at.is_(None))
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # If updating dependency, check DAG cycles
    if data.depends_on_task_id is not None and data.depends_on_task_id != task.depends_on_task_id:
        is_cycle = await dag_engine.detect_cycle(db, task.id, data.depends_on_task_id)
        if is_cycle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cyclical dependency detected! A task cannot directly or indirectly depend on itself.",
            )

    # Dynamic Deadline Cascading: If due_at is updated and pushed forward
    if data.due_at and data.due_at > task.due_at:
        await dag_engine.cascade_deadline_delay(db, task, data.due_at)

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(task, k, v)

    await db.commit()
    await db.refresh(task)
    return ApiResponse(data=TaskOut.model_validate(task))


@router.post("/{id}/transition-state", response_model=ApiResponse[dict])
async def transition_task_state(
    id: uuid.UUID,
    data: TaskTransitionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).options(selectinload(Task.depends_on_task)).where(Task.id == id, Task.deleted_at.is_(None))
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # DAG Dependency Enforcement: Cannot transition if upstream dependency is not COMPLETED
    can_proceed, reason = await dag_engine.validate_dependency_transition(db, task, data.new_status)
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DAG Constraint Violation: {reason}",
        )

    old_status = task.status
    task.status = data.new_status

    if data.new_status == TaskStatus.COMPLETED:
        task.completed_at = datetime.utcnow()
        # Trigger Rule 1: Unlock downstream DAG dependencies & trigger handoffs
        await automation_bus.on_task_completed(db, task)
    elif old_status == TaskStatus.COMPLETED and data.new_status != TaskStatus.COMPLETED:
        task.completed_at = None

    await db.commit()
    await db.refresh(task)

    # Broadcast real-time state change
    await ws_manager.broadcast({
        "type": "TASK_MUTATION",
        "task_id": str(task.id),
        "title": task.title,
        "old_status": old_status.value,
        "new_status": task.status.value,
    })

    return ApiResponse(
        data={
            "task_id": str(task.id),
            "title": task.title,
            "old_status": old_status.value,
            "new_status": task.status.value,
            "message": f"Task successfully transitioned to {task.status.value}",
        }
    )


@router.post("/{id}/time-log", response_model=ApiResponse[TaskOut])
async def log_task_time(
    id: uuid.UUID,
    data: TimeLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).where(Task.id == id, Task.deleted_at.is_(None))
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.logged_hours += data.hours_to_add
    await db.commit()
    await db.refresh(task)
    return ApiResponse(data=TaskOut.model_validate(task))


@router.delete("/{id}", response_model=ApiResponse[dict])
async def delete_task(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).where(Task.id == id, Task.deleted_at.is_(None))
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return ApiResponse(data={"message": f"Task '{task.title}' deleted successfully", "id": str(id)})

