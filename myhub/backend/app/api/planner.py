from fastapi import APIRouter
from pydantic import BaseModel

from app.planner_store import (
    create_block,
    create_goal,
    create_tag,
    create_task,
    delete_block,
    delete_task,
    get_planner_state,
    update_block,
    update_task,
)

router = APIRouter(prefix="/planner", tags=["planner"])


class TaskCreateRequest(BaseModel):
    id: str
    title: str
    notes: str | None = None
    due_date: str | None = None
    due_time: str | None = None
    tag_ids: list[str] = []
    goal_id: str | None = None
    repeat: dict | None = None
    completed_dates: list[str] = []


class TaskUpdateRequest(BaseModel):
    title: str | None = None
    notes: str | None = None
    due_date: str | None = None
    due_time: str | None = None
    tag_ids: list[str] | None = None
    goal_id: str | None = None
    repeat: dict | None = None
    completed_dates: list[str] | None = None


class BlockCreateRequest(BaseModel):
    id: str
    task_id: str | None = None
    title: str
    notes: str | None = None
    date: str
    start_time: str
    end_time: str
    tag_ids: list[str] = []
    goal_id: str | None = None
    repeat: dict | None = None
    pushed_to_google: bool = False


class BlockUpdateRequest(BaseModel):
    title: str | None = None
    notes: str | None = None
    date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    tag_ids: list[str] | None = None
    goal_id: str | None = None
    repeat: dict | None = None
    pushed_to_google: bool | None = None


class TagCreateRequest(BaseModel):
    id: str
    label: str
    color: str


class GoalCreateRequest(BaseModel):
    id: str
    label: str


@router.get("/state")
def state():
    return get_planner_state()


@router.post("/tasks")
def create_task_route(req: TaskCreateRequest):
    return create_task(req.model_dump())


@router.patch("/tasks/{task_id}")
def update_task_route(task_id: str, req: TaskUpdateRequest):
    return update_task(task_id, req.model_dump(exclude_unset=True))


@router.delete("/tasks/{task_id}")
def delete_task_route(task_id: str):
    delete_task(task_id)
    return {"ok": True}


@router.post("/blocks")
def create_block_route(req: BlockCreateRequest):
    return create_block(req.model_dump())


@router.patch("/blocks/{block_id}")
def update_block_route(block_id: str, req: BlockUpdateRequest):
    return update_block(block_id, req.model_dump(exclude_unset=True))


@router.delete("/blocks/{block_id}")
def delete_block_route(block_id: str):
    delete_block(block_id)
    return {"ok": True}


@router.post("/tags")
def create_tag_route(req: TagCreateRequest):
    return create_tag(req.model_dump())


@router.post("/goals")
def create_goal_route(req: GoalCreateRequest):
    return create_goal(req.model_dump())
