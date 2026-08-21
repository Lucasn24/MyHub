from functools import lru_cache
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.email_pipeline.agents import categorize_email, detect_events, extract_tasks
from app.email_pipeline.schemas import (
    DetectedEvent,
    EmailCategory,
    EmailInput,
    ExtractedTask,
)


class EmailPipelineState(TypedDict):
    email: EmailInput
    category: EmailCategory | None
    tasks: list[ExtractedTask]
    events: list[DetectedEvent]


def categorize_node(state: EmailPipelineState) -> dict:
    result = categorize_email(state["email"])
    return {"category": result.category}


def task_detection_node(state: EmailPipelineState) -> dict:
    return {"tasks": extract_tasks(state["email"])}


def event_detection_node(state: EmailPipelineState) -> dict:
    return {"events": detect_events(state["email"])}


def route_after_categorize(state: EmailPipelineState) -> str:
    if state["category"] == EmailCategory.MEETING:
        return "event_detection"
    if state["category"] == EmailCategory.ACTION_REQUIRED:
        return "task_detection"
    return END


@lru_cache
def get_email_pipeline_graph():
    graph = StateGraph(EmailPipelineState)
    graph.add_node("categorize", categorize_node)
    graph.add_node("event_detection", event_detection_node)
    graph.add_node("task_detection", task_detection_node)

    graph.add_edge(START, "categorize")
    graph.add_conditional_edges(
        "categorize",
        route_after_categorize,
        {"event_detection": "event_detection", "task_detection": "task_detection", END: END},
    )
    graph.add_edge("event_detection", END)
    graph.add_edge("task_detection", END)

    return graph.compile()


def run_email_pipeline(email: EmailInput) -> EmailPipelineState:
    initial_state: EmailPipelineState = {"email": email, "category": None, "tasks": [], "events": []}
    return get_email_pipeline_graph().invoke(initial_state)


if __name__ == "__main__":
    sample = EmailInput(
        subject="Quick sync tomorrow?",
        sender="jane@example.com",
        snippet="Can we grab 30 mins tomorrow at 2pm to go over the roadmap? Let me know if that works.",
    )
    print(run_email_pipeline(sample))
