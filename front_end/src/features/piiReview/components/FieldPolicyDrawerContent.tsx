import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

import type { FieldProfile } from '../api/realPiiReviewApi';
import {
  type FieldDecisionNote,
  getFieldKind,
  needsException,
  validateFieldDecision,
} from '../model/fieldDecision';
import { type PolicyAction, getActionLabel } from '../model/policyLabels';
import { ActionSelect } from './ActionSelect';
import { DetectorBadge, SensitivityChip } from './PolicyChips';

interface FieldPolicyDrawerContentProps {
  field: FieldProfile;
  initialAction: PolicyAction;
  initialNote: FieldDecisionNote;
  /** "orders.customer_id, ..." when the field is a join key, else null. */
  joinPartnerLabel: string | null;
  isActionDisabled: (action: PolicyAction) => boolean;
  getActionOptionNote: (action: PolicyAction) => string;
  onSave: (action: PolicyAction, note: FieldDecisionNote) => void;
  onClose: () => void;
  /** Published runs are shown for reference only; saving is disabled. */
  readOnly?: boolean;
}

/**
 * Inspector body for one field. The draft lives here (not in the review page) so typing a reason
 * only re-renders this panel instead of the whole review table. Mount it with key={field.id}.
 */
export function FieldPolicyDrawerContent({
  field,
  initialAction,
  initialNote,
  joinPartnerLabel,
  isActionDisabled,
  getActionOptionNote,
  onSave,
  onClose,
  readOnly = false,
}: FieldPolicyDrawerContentProps): JSX.Element {
  const [draftAction, setDraftAction] = useState<PolicyAction>(initialAction);
  const [draftNote, setDraftNote] = useState<FieldDecisionNote>(initialNote);
  const [error, setError] = useState<string | null>(null);

  const kind = getFieldKind(field.classification);
  const showException = needsException(kind, draftAction);
  const reasonRequired = draftAction !== field.recommended_action || draftNote.notPersonal || showException;

  const handleSave = () => {
    if (isActionDisabled(draftAction)) {
      setError('Khóa nối chỉ được Băm HMAC (hoặc Giữ nguyên khi mọi đầu nối đều không phải PII).');
      return;
    }
    const note: FieldDecisionNote = {
      ...draftNote,
      notPersonal: kind === 'UNKNOWN' && draftNote.notPersonal,
      exceptionUntil: showException ? draftNote.exceptionUntil : '',
    };
    const message = validateFieldDecision({
      kind,
      action: draftAction,
      recommendedAction: field.recommended_action,
      note,
      today: new Date().toISOString().slice(0, 10),
    });
    if (message) {
      setError(message);
      return;
    }
    onSave(draftAction, note);
  };

  return (
    <Stack spacing={2.5} sx={{ height: '100%' }}>
      {/* Drawer Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <ShieldOutlinedIcon color="primary" />
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Chi tiết chính sách cột
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Đóng">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Divider />

      {/* Column Identifier Box */}
      <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.50', border: 1, borderColor: 'divider' }}>
        <Typography variant="overline" color="text.secondary" display="block">
          Cột dữ liệu
        </Typography>
        <Typography variant="subtitle1" color="text.primary" sx={{ fontFamily: 'monospace', fontWeight: 700, overflowWrap: 'anywhere' }}>
          {field.field_path}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          <SensitivityChip classification={field.classification} />
          <DetectorBadge source={field.detector_source} />
        </Stack>
      </Box>

      {joinPartnerLabel && (
        <Alert severity="info">
          Khóa nối với <strong>{joinPartnerLabel}</strong>. Hành động bạn chọn sẽ áp dụng cho mọi đầu nối, để Analyst
          vẫn ghép bảng được.
        </Alert>
      )}

      {/* Legal Basis Callout */}
      <Alert severity="info" icon={false}>
        <Typography variant="caption" component="p" sx={{ fontWeight: 700, color: 'info.dark' }}>
          Căn cứ pháp lý: Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP
        </Typography>
        <Typography variant="caption" component="p" sx={{ color: 'inherit', mt: 0.5, lineHeight: 1.5 }}>
          {kind === 'SENSITIVE' &&
            'Dữ liệu cá nhân nhạy cảm gắn liền với quyền riêng tư của cá nhân. Bắt buộc áp dụng biện pháp bảo vệ cao nhất.'}
          {kind === 'PII' &&
            'Dữ liệu cá nhân cơ bản giúp nhận dạng cá nhân. Giữ nguyên chỉ được phép dưới dạng ngoại lệ có thời hạn.'}
          {kind === 'UNKNOWN' &&
            'Hệ thống chưa xác định được cột này. Nếu bạn chắc chắn đây không phải dữ liệu cá nhân, hãy xác nhận kèm lý do để được giữ nguyên.'}
          {kind === 'NON_PERSONAL' && 'Không phải dữ liệu cá nhân: có thể giữ nguyên để Analyst phân tích.'}
          {kind === 'QUASI' &&
            'Định danh gián tiếp (L1): chỉ nhận ra người khi ghép với dữ liệu khác. Được giữ nguyên để phân tích vì định danh trực tiếp (tên, SĐT, CCCD) đã được che.'}
        </Typography>
      </Alert>

      {/* Selected Action Override */}
      <Box>
        <Typography
          component="label"
          htmlFor="field-policy-action"
          variant="caption"
          sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mb: 1 }}
        >
          Hành động (đề xuất: {getActionLabel(field.recommended_action)})
        </Typography>
        <ActionSelect
          id="field-policy-action"
          value={draftAction}
          onChange={(action) => {
            setDraftAction(action);
            setError(null);
          }}
          isDisabled={isActionDisabled}
          getNote={getActionOptionNote}
          ariaLabel={`Hành động cho ${field.field_path}`}
        />
      </Box>

      {/* UNKNOWN -> confirm not personal data (backend reclassifies to NON_PERSONAL) */}
      {kind === 'UNKNOWN' && (
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={draftNote.notPersonal}
              onChange={(e) => {
                const checked = e.target.checked;
                setDraftNote((note) => ({ ...note, notPersonal: checked }));
                if (checked) setDraftAction('KEEP');
                setError(null);
              }}
            />
          }
          label={
            <Typography variant="body2">
              Tôi xác nhận cột này <strong>không phải dữ liệu cá nhân</strong> (chuyển sang Không phải PII)
            </Typography>
          }
        />
      )}

      {/* Justification (per field) */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mb: 1 }}>
          Lý do {reasonRequired ? '(bắt buộc)' : '(tùy chọn)'}
        </Typography>
        <TextField
          multiline
          rows={3}
          placeholder="Ví dụ: Trạng thái xử lý ticket, không định danh được cá nhân."
          value={draftNote.reason}
          onChange={(e) => {
            const reason = e.target.value;
            setDraftNote((note) => ({ ...note, reason }));
          }}
          fullWidth
          size="small"
        />
      </Box>

      {/* Exception deadline: only when keeping a PII field below the masking floor */}
      {showException && (
        <Box>
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            Giữ nguyên cột PII là <strong>ngoại lệ</strong>: chỉ có hiệu lực đến ngày bạn chọn, sau đó phải che lại.
          </Alert>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mb: 1 }}>
            Ngoại lệ có hiệu lực đến (bắt buộc)
          </Typography>
          <TextField
            type="date"
            value={draftNote.exceptionUntil}
            onChange={(e) => {
              const exceptionUntil = e.target.value;
              setDraftNote((note) => ({ ...note, exceptionUntil }));
            }}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {/* Footer */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button variant="contained" fullWidth onClick={handleSave} disabled={readOnly}>
          {readOnly ? 'Quyết định đã khóa' : 'Lưu & áp dụng thay đổi'}
        </Button>
      </Box>
    </Stack>
  );
}
