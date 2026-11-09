import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Set, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
import logging

from app.models.models import Task, AutomationAuditLog
from app.models.enums import TaskStatus

logger = logging.getLogger(__name__)


class DAGEngine:
    @staticmethod
    async def detect_cycle(
        db: AsyncSession,
        task_id: uuid.UUID,
        candidate_dependency_id: uuid.UUID,
    ) -> bool:
        """
        Detects if making candidate_dependency_id a dependency of task_id causes a cycle.
        Returns True if a cycle is detected, False otherwise.
        """
        if task_id == candidate_dependency_id:
            return True

        visited: Set[uuid.UUID] = set()
        queue: List[uuid.UUID] = [candidate_dependency_id]

        while queue:
            curr_id = queue.pop(0)
            if curr_id == task_id:
                return True
            if curr_id in visited:
                continue
            visited.add(curr_id)

            query = select(Task.depends_on_task_id).where(
                Task.id == curr_id,
                Task.deleted_at.is_(None)
            )
            res = await db.execute(query)
            parent_dep = res.scalar_one_or_none()
            if parent_dep:
                queue.append(parent_dep)

        return False

    @staticmethod
    async def validate_dependency_transition(
        db: AsyncSession,
        task: Task,
        new_status: TaskStatus,
    ) -> Tuple[bool, Optional[str]]:
        """
        Ensures a task cannot start if its upstream dependency is not COMPLETED.
        """
        if not task.depends_on_task_id:
            return True, None

        # If user attempts to move to active states while dependency is incomplete
        active_states = {
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.INTERNAL_QA,
            TaskStatus.CLIENT_REVIEW,
            TaskStatus.COMPLETED,
        }

        if new_status in active_states:
            query = select(Task).where(Task.id == task.depends_on_task_id, Task.deleted_at.is_(None))
            res = await db.execute(query)
            dependency_task = res.scalar_one_or_none()

            if dependency_task and dependency_task.status != TaskStatus.COMPLETED:
                return False, f"Blocked by incomplete dependency: '{dependency_task.title}' (Status: {dependency_task.status.value})"

        return True, None

    @staticmethod
    async def unlock_downstream_dependencies(
        db: AsyncSession,
        completed_task: Task,
    ) -> List[Task]:
        """
        When a task is marked COMPLETED, find all tasks that depended on it and unlock them.
        """
        query = select(Task).where(
            Task.depends_on_task_id == completed_task.id,
            Task.status == TaskStatus.BLOCKED,
            Task.deleted_at.is_(None),
        )
        res = await db.execute(query)
        downstream_tasks = list(res.scalars().all())

        unlocked: List[Task] = []
        for dt in downstream_tasks:
            dt.status = TaskStatus.TODO
            unlocked.append(dt)
            # Log audit trail
            audit = AutomationAuditLog(
                trigger_event="TASK_STATUS_CHANGED",
                entity_type="Task",
                entity_id=dt.id,
                action_taken=f"Task unlocked automatically from BLOCKED -> TODO following completion of '{completed_task.title}'",
                status="SUCCESS",
                details={
                    "upstream_task_id": str(completed_task.id),
                    "unlocked_task_id": str(dt.id),
                },
            )
            db.add(audit)

        return unlocked

    @staticmethod
    async def cascade_deadline_delay(
        db: AsyncSession,
        upstream_task: Task,
        new_due_at: datetime,
    ) -> List[dict]:
        """
        If an upstream task is delayed past its previous deadline, dynamically cascade
        the delay to downstream dependent tasks.
        """
        if new_due_at <= upstream_task.due_at:
            return []

        delay_delta = new_due_at - upstream_task.due_at
        cascaded_updates = []

        # Breadth-first traversal of dependent tasks
        queue = [upstream_task.id]
        while queue:
            parent_id = queue.pop(0)
            query = select(Task).where(
                Task.depends_on_task_id == parent_id,
                Task.deleted_at.is_(None),
            )
            res = await db.execute(query)
            children = res.scalars().all()

            for child in children:
                old_child_due = child.due_at
                child.due_at = child.due_at + delay_delta
                cascaded_updates.append({
                    "task_id": str(child.id),
                    "title": child.title,
                    "old_due": old_child_due.isoformat(),
                    "new_due": child.due_at.isoformat(),
                    "delayed_by_hours": delay_delta.total_seconds() / 3600,
                })
                # Add audit log
                audit = AutomationAuditLog(
                    trigger_event="DAG_DEADLINE_CASCADE",
                    entity_type="Task",
                    entity_id=child.id,
                    action_taken=f"Deadline cascaded by +{delay_delta.total_seconds() / 3600:.1f}h due to delay in upstream task '{upstream_task.title}'",
                    status="SUCCESS",
                    details={
                        "upstream_task_id": str(upstream_task.id),
                        "old_due": old_child_due.isoformat(),
                        "new_due": child.due_at.isoformat(),
                    },
                )
                db.add(audit)
                queue.append(child.id)

        return cascaded_updates


dag_engine = DAGEngine()

