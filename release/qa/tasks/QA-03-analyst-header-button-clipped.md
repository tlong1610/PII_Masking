# QA-03: Nút "Tải CSV" ở header dataset của Analyst bị cắt chữ

**Lỗi:** BUG-03 · **Mức độ:** Trung bình (UI) · **Test bắt lỗi:** TC-AN-04 · **Phân hệ:** `AnalystDatasetExperienceMVP.tsx`

## Hiện tượng
Ở màn 1440px, nút "Tải CSV bảng customers" bị đẩy ra mép phải card và gãy thành 3 dòng ("Tài C / bản / custo").

## Nguyên nhân gốc
- Dòng "Vị trí snapshot: postgres://…/customers,kyc_documents,…" là một chuỗi dài không có khoảng trắng.
- Khối chữ bên trái không có `minWidth: 0`, nên flexbox không co lại được và chiếm hết chỗ của nút.

## Giải pháp
- Khối trái thêm `minWidth: 0; flex: 1`. Dòng chip và vị trí được `flexWrap`. Vị trí snapshot thêm `wordBreak: break-all`.
- Nút thêm `whiteSpace: nowrap; flexShrink: 0`.

## Nghiệm thu
- [x] TC-AN-04 đạt: nút nằm trong viewport, cao < 48px (một dòng).
