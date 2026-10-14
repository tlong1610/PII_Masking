import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '../api/auditApi';
import { BlockDetailDrawer } from './BlockDetailDrawer';

const mockEvent: AuditEvent = {
  id: 42,
  actor_id: 1,
  actor_username: 'dpo_lead',
  role: 'DPO',
  action: 'REVOKE',
  entity_type: 'dataset',
  entity_id: '99',
  reason: 'Hết hạn ngoại lệ bảo mật exceptionUntil',
  created_at: '2026-10-14T11:00:00Z',
  prev_hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  entry_hash: '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
};

describe('BlockDetailDrawer', () => {
  it('renders block full hashes and reason when open', () => {
    render(<BlockDetailDrawer event={mockEvent} open={true} onClose={vi.fn()} />);

    expect(screen.getByText('Chi tiết khối #42')).toBeInTheDocument();
    expect(screen.getByText(mockEvent.entry_hash)).toBeInTheDocument();
    expect(screen.getByText(mockEvent.prev_hash)).toBeInTheDocument();
    expect(screen.getByText('Hết hạn ngoại lệ bảo mật exceptionUntil')).toBeInTheDocument();
  });

  it('calls onClose when close icon button is clicked', () => {
    const handleClose = vi.fn();
    render(<BlockDetailDrawer event={mockEvent} open={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Đóng chi tiết khối');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledOnce();
  });
});
