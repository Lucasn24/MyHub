from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END, MessagesState

from app.config import getLLM


def call_model(state: MessagesState):
    response = getLLM().invoke(state["messages"])
    return {"messages": [response]}


builder = StateGraph(MessagesState)
builder.add_node("call_model", call_model)
builder.add_edge(START, "call_model")
builder.add_edge("call_model", END)

graph = builder.compile(checkpointer=MemorySaver())


if __name__ == "__main__":
    config = {"configurable": {"thread_id": "cli"}}
    result = graph.invoke(
        {"messages": [{"role": "user", "content": "Say hello in one sentence."}]},
        config=config,
    )
    print(result["messages"][-1].content)
