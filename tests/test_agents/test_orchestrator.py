"""Tests for 8-Node LangGraph Orchestrator and HITL Flow (§7.1, §7.4)."""

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from src.agents.orchestrator import (
    OrchestratorState,
    build_orchestrator_graph,
    orchestrator_agent,
)


def test_orchestrator_graph_structure():
    """Kiểm tra đồ thị có đầy đủ cả 8 node theo đặc tả §7.1."""
    nodes = orchestrator_agent.get_graph().nodes
    expected_nodes = {"scan", "classify", "policy", "human_review", "mask", "verify", "report", "alert"}
    assert expected_nodes.issubset(set(nodes.keys()))


def test_orchestrator_full_hitl_approval_flow():
    """Kiểm tra toàn bộ luồng 8 node: scan -> classify -> policy -> interrupt (HITL) -> resume -> mask -> verify -> report -> alert."""
    chk = InMemorySaver()
    graph = build_orchestrator_graph(checkpointer=chk)

    cfg = {"configurable": {"thread_id": "orch_run_001"}}

    # 1. Bắt đầu luồng
    state_init: OrchestratorState = {
        "run_id": "orch_run_001",
        "dataset_name": "customers_table",
    }

    # Chạy tới điểm dừng human_review (interrupt)
    graph.invoke(state_init, config=cfg)

    # Kiểm tra trạng thái đang tạm dừng tại interrupt
    current_state = graph.get_state(cfg)
    assert len(current_state.tasks) > 0  # Có task đang chờ resume
    assert "scan" in current_state.values or "columns" in current_state.values
    assert len(current_state.values.get("policy_proposals", [])) > 0

    # 2. DPO nộp quyết định phê duyệt (Command resume)
    dpo_decisions = [
        {"field_path": "customer_cccd", "action": "HMAC", "reason": "Phê duyệt băm join key"},
        {"field_path": "phone_number", "action": "MASK", "reason": "Phê duyệt che số điện thoại"},
        {"field_path": "email", "action": "MASK", "reason": "Phê duyệt che email"},
    ]
    resume_payload = {"status": "approved", "decisions": dpo_decisions}

    final_result = graph.invoke(Command(resume=resume_payload), config=cfg)

    # 3. Khẳng định tất cả các bước tiếp theo đã hoàn tất thành công
    assert final_result["status"] == "COMPLETED"
    assert final_result["review_status"] == "approved"
    assert len(final_result["applied"]) == 3
    assert final_result["verification"]["passed"] is True
    assert final_result["verification"]["zero_raw_pii_leaks"] is True
    assert final_result["report_id"].startswith("rep_")
    assert final_result["report_data"]["taxonomy_version"] == "v1.0"
    assert "risk" in final_result
    assert final_result["risk"]["score"] >= 0.0


def test_orchestrator_rejection_path_bypasses_mask_and_verify():
    """DPO từ chối phê duyệt -> bỏ qua mask và verify, nhảy thẳng tới report và alert (§7.1)."""
    chk = InMemorySaver()
    graph = build_orchestrator_graph(checkpointer=chk)
    cfg = {"configurable": {"thread_id": "orch_run_002"}}

    # Khởi động và chạy đến interrupt
    graph.invoke({"run_id": "orch_run_002"}, config=cfg)

    # DPO gửi quyết định từ chối
    final_result = graph.invoke(Command(resume="rejected"), config=cfg)

    assert final_result["status"] == "REJECTED"
    assert final_result["review_status"] == "rejected"
    # Không thực hiện mask hoặc verify
    assert len(final_result.get("applied", [])) == 0
    assert final_result.get("verification") is None
    # Báo cáo vẫn được sinh (ghi nhận trạng thái từ chối)
    assert final_result.get("report_id") is not None
    # Điểm rủi ro cao vì dữ liệu chưa được che
    assert final_result["risk"]["cov_factor"] == 1.0


def test_orchestrator_pre_approved_state_runs_directly_to_end():
    """Nếu state đã được nạp sẵn review_status='approved' (e.g. batch run), đồ thị chạy trơn tru từ đầu tới cuối."""
    chk = InMemorySaver()
    graph = build_orchestrator_graph(checkpointer=chk)
    cfg = {"configurable": {"thread_id": "orch_run_003"}}

    res = graph.invoke(
        {
            "run_id": "orch_run_003",
            "review_status": "approved",
            "approvals": [{"field_path": "customer_cccd", "action": "HMAC"}],
        },
        config=cfg,
    )
    assert res["status"] == "COMPLETED"
    assert res["verification"]["passed"] is True


def test_orchestrator_changes_requested_loop():
    """Kiểm tra luồng changes_requested quay lại policy (tối đa 2 vòng) theo §7.1."""
    chk = InMemorySaver()
    graph = build_orchestrator_graph(checkpointer=chk)
    cfg = {"configurable": {"thread_id": "orch_run_004"}}

    # Bắt đầu và chạy đến interrupt lần 1
    graph.invoke({"run_id": "orch_run_004"}, config=cfg)

    # Vòng 1: Yêu cầu sửa đổi (changes_requested)
    graph.invoke(Command(resume="changes_requested"), config=cfg)
    st1 = graph.get_state(cfg)
    assert st1.values.get("review_round") == 1
    # Đồ thị quay lại policy rồi dừng lại tại human_review lần 2
    assert len(st1.tasks) > 0

    # Vòng 2: Phê duyệt sau khi đã cập nhật
    final_res = graph.invoke(
        Command(resume={"status": "approved", "decisions": [{"field_path": "customer_cccd", "action": "MASK"}]}),
        config=cfg,
    )
    assert final_res["status"] == "COMPLETED"
    assert final_res["review_status"] == "approved"
    assert len(final_res["applied"]) == 1


def test_orchestrator_verify_node_catches_unmasked_pii_leak():
    """Kiểm tra verify_node thật: nếu DPO phê duyệt KEEP cho PII L3/L2 mà không có ngoại lệ,
    verify_node sẽ phát hiện rò rỉ PII, đánh dấu zero_raw_pii_leaks=False và status='FAILED'.
    """
    chk = InMemorySaver()
    graph = build_orchestrator_graph(checkpointer=chk)
    cfg = {"configurable": {"thread_id": "orch_run_leak_test"}}

    graph.invoke({"run_id": "orch_run_leak_test"}, config=cfg)

    # Phê duyệt nhưng cố tình KEEP CCCD (L3 PII)
    bad_decisions = [
        {"field_path": "customer_cccd", "action": "KEEP"},
        {"field_path": "customer_phone", "action": "MASK"},
    ]
    res = graph.invoke(
        Command(resume={"status": "approved", "decisions": bad_decisions}),
        config=cfg,
    )

    assert res["status"] == "FAILED"
    assert res["verification"]["passed"] is False
    assert res["verification"]["zero_raw_pii_leaks"] is False
    assert len(res["verification"]["failures"]) > 0
    assert any("customer_cccd" in f for f in res["verification"]["failures"])

