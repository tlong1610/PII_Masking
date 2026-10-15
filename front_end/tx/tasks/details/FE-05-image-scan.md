# FE-05: Add Image Scan Flow

Status: closed (Won't do / Out of Scope)
Sprint: Post-MVP (Đã đóng)

## Goal

Add a DPO workflow for scanning image-based PII.

This is not part of the current database MVP. Keep it blocked until backend has a real image/OCR API and product confirms image data is back in scope.

## Scope

- Image upload UI
- OCR/scan processing state
- Detection review
- Redacted preview
- Unsupported file error

## References

- `tx/planing/sprints/sprint_03.md`
- `tx/specs/product.md`
- `tx/adrs/0001_architecture_style.md`

## Acceptance

- Original image PII is not exposed after scan
- DPO can approve redaction result
- Unsupported image files are blocked clearly

## Blocker

- Trello has no OCR/image scan backend task or completed API contract.
- Backend routes currently expose auth, sources, runs, datasets, `/me`, `/dpo-check`, chat/status only.
- Repo search found OCR fields inside existing DB/Mongo scan data, but no image upload/OCR API.

Need BE contract before FE implementation:

- `POST /image-runs` or equivalent upload endpoint
- safe detection metadata response, no raw OCR text
- redacted preview/result endpoint
- DPO approve/build/publish semantics for image output
