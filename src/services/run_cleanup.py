"""Remove a run's metadata rows. The audit trail is never touched (it is a tamper-evident chain)."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.db import models as db_models


def delete_run_metadata(db: Session, run_id: int) -> None:
    """Delete a run and everything hanging off it, children first. Caller commits."""
    dataset_ids = db.scalars(select(db_models.Dataset.id).where(db_models.Dataset.run_id == run_id)).all()
    if dataset_ids:
        db.execute(delete(db_models.DatasetGrant).where(db_models.DatasetGrant.dataset_id.in_(dataset_ids)))
        db.execute(delete(db_models.VerifierResult).where(db_models.VerifierResult.dataset_id.in_(dataset_ids)))
        db.execute(delete(db_models.Dataset).where(db_models.Dataset.id.in_(dataset_ids)))
    db.execute(delete(db_models.FieldDecisionHistory).where(db_models.FieldDecisionHistory.run_id == run_id))
    db.execute(delete(db_models.FieldDecision).where(db_models.FieldDecision.run_id == run_id))
    db.execute(delete(db_models.FieldProfile).where(db_models.FieldProfile.run_id == run_id))
    db.execute(delete(db_models.Run).where(db_models.Run.id == run_id))
