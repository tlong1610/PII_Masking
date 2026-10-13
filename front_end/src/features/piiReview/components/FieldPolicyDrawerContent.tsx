import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
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
import { POLICY_ACTIONS, type PolicyAction, getActionLabel } from '../model/policyLabels';
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
          <ShieldOutlinedIcon sx={{ color: '#1B51A4' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Chi tiết chính sách cột
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Đóng ngăn kéo">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Divider />

      {/* Column Identifier Box */}
      <Box sx={{ p: 2, borderRadius: '6px', bgcolor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <Typography variant="caption" sx={{ color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
          Cột dữ liệu
        </Typography>
        <Typography variant="subtitle1" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>
          {field.field_path}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <SensitivityChip classification={field.classification} />
          <DetectorBadge source={field.detector_source} />
        </Stack>
      </Box>

      {joinPartnerLabel && (
        <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
          Khóa nối với <strong>{joinPartnerLabel}</strong>. Hành động bạn chọn sẽ áp dụng cho mọi đầu nối, để Analyst
          vẫn ghép bảng được.
        </Alert>
      )}

      {/* Legal Basis Callout */}
      <Box sx={{ p: 2, borderRadius: '6px', bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E40AF', display: 'block' }}>
          Căn cứ pháp lý: Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP
        </Typography>
        <Typography variant="caption" sx={{ color: '#1E3A8A', mt: 0.5, display: 'block', lineHeight: 1.5 }}>
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
      </Box>

      {/* Selected Action Override */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 1 }}>
          Hành động (đề xuất: {getActionLabel(field.recommended_action)}):
        </Typography>
        <FormControl size="small" fullWidth>
          <Select<PolicyAction>
            value={draftAction}
            onChange={(e) => {
              setDraftAction(e.target.value as PolicyAction);
              setError(null);
            }}
          >
            {POLICY_ACTIONS.map((opt) => (
              <MenuItem value={opt} key={opt} disabled={isActionDisabled(opt)}>
                {getActionLabel(opt)} {getActionOptionNote(opt)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
              Tôi xác nhận cột này <strong>không phải dữ liệu cá nhân</strong> (chuyển sang Non-PII)
            </Typography>
          }
        />
      )}

      {/* Justification (per field) */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 1 }}>
          Lý do {reasonRequired ? '(bắt buộc)' : '(tùy chọn)'}:
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
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.75rem' }}>
            Giữ nguyên cột PII là <strong>ngoại lệ</strong>: chỉ có hiệu lực đến ngày bạn chọn, sau đó phải che lại.
          </Alert>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 1 }}>
            Ngoại lệ có hiệu lực đến (bắt buộc):
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
        <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
          {error}
        </Alert>
      )}

      {/* Footer */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          sx={{ bgcolor: '#1B51A4', '&:hover': { bgcolor: '#154185' } }}
        >
          Lưu &amp; Áp dụng thay đổi
        </Button>
      </Box>
    </Stack>
  );
}
