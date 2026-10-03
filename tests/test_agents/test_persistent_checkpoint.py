"""Tests for Persistent CSDL Checkpointer (PostgresSaver / SqliteSaver §7)."""

import sqlite3
from pathlib import Path
from typing import TypedDict

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from src.agents.checkpointer import get_checkpoint_saver, reset_checkpoint_saver


class SimpleState(TypedDict):
    step: str
    counter: int


def node_step1(state: SimpleState) -> dict:
    return {"step": "step1_done", "counter": state.get("counter", 0) + 1}


def node_step2(state: SimpleState) -> dict:
    return {"step": "step2_done", "counter": state.get("counter", 0) + 1}


def test_persistent_sqlite_checkpoint_resumes_across_instances(tmp_path: Path):
    """Kiểm tra checkpoint ghi vào tệp CSDL SQLite và khôi phục được sau khi tạo saver mới (mô phỏng container restart)."""
    db_file = tmp_path / "checkpoints_test.sqlite"
    conn1 = sqlite3.connect(str(db_file), check_same_thread=False)
    saver1 = SqliteSaver(conn1)
    saver1.setup()

    # Xây dựng graph đơn giản có checkpointer
    builder = StateGraph(SimpleState)
    builder.add_node("step1", node_step1)
    builder.add_node("step2", node_step2)
    builder.add_edge(START, "step1")
    builder.add_edge("step1", "step2")
    builder.add_edge("step2", END)

    graph1 = builder.compile(checkpointer=saver1)

    thread_cfg = {"configurable": {"thread_id": "test_run_101"}}
    res1 = graph1.invoke({"step": "init", "counter": 0}, config=thread_cfg)
    assert res1["step"] == "step2_done"
    assert res1["counter"] == 2

    # Đóng kết nối 1 (mô phỏng tiến trình tắt / crash)
    conn1.close()

    # Mở kết nối mới trên cùng file SQLite (mô phỏng tiến trình khởi động lại)
    conn2 = sqlite3.connect(str(db_file), check_same_thread=False)
    saver2 = SqliteSaver(conn2)
    graph2 = builder.compile(checkpointer=saver2)

    # Đọc lại checkpoint đã lưu từ phiên trước
    saved_state = graph2.get_state(thread_cfg)
    assert saved_state is not None
    assert saved_state.values["step"] == "step2_done"
    assert saved_state.values["counter"] == 2
    conn2.close()


def test_get_checkpoint_saver_factory(monkeypatch, tmp_path: Path):
    """Kiểm tra factory get_checkpoint_saver khởi tạo đúng loại saver bền vững theo cấu hình."""
    reset_checkpoint_saver()
    db_test = tmp_path / "app_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_test}")

    saver = get_checkpoint_saver(force_new=True)
    assert saver is not None
    assert isinstance(saver, SqliteSaver)
    reset_checkpoint_saver()
