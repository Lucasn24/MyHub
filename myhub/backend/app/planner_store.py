from app.config import get_supabase_client

TASKS_TABLE = "planner_tasks"
BLOCKS_TABLE = "planner_blocks"
TAGS_TABLE = "planner_tags"
GOALS_TABLE = "planner_goals"


def get_planner_state() -> dict:
    client = get_supabase_client()
    tasks = client.table(TASKS_TABLE).select("*").order("created_at").execute().data
    blocks = client.table(BLOCKS_TABLE).select("*").order("created_at").execute().data
    tags = client.table(TAGS_TABLE).select("*").order("created_at").execute().data
    goals = client.table(GOALS_TABLE).select("*").order("created_at").execute().data
    return {"tasks": tasks, "blocks": blocks, "tags": tags, "goals": goals}


def create_task(row: dict) -> dict:
    result = get_supabase_client().table(TASKS_TABLE).insert(row).execute()
    return result.data[0]


def update_task(task_id: str, updates: dict) -> dict:
    result = get_supabase_client().table(TASKS_TABLE).update(updates).eq("id", task_id).execute()
    return result.data[0]


def delete_task(task_id: str) -> None:
    get_supabase_client().table(TASKS_TABLE).delete().eq("id", task_id).execute()


def create_block(row: dict) -> dict:
    result = get_supabase_client().table(BLOCKS_TABLE).insert(row).execute()
    return result.data[0]


def update_block(block_id: str, updates: dict) -> dict:
    result = get_supabase_client().table(BLOCKS_TABLE).update(updates).eq("id", block_id).execute()
    return result.data[0]


def delete_block(block_id: str) -> None:
    get_supabase_client().table(BLOCKS_TABLE).delete().eq("id", block_id).execute()


def create_tag(row: dict) -> dict:
    result = get_supabase_client().table(TAGS_TABLE).insert(row).execute()
    return result.data[0]


def create_goal(row: dict) -> dict:
    result = get_supabase_client().table(GOALS_TABLE).insert(row).execute()
    return result.data[0]
