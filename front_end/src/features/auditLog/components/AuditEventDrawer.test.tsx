import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '../api/auditApi';
import { AuditActivityTable } from './AuditActivityTable';
import { AuditEventDrawer } from './AuditEventDrawer';

const saveEvent: AuditEvent = {
  id: 42,
  actor_id: 1,
  actor_username: 'dpo',
  role: 'DPO',
  action: 'save_decisions',
  entity_type: 'run',
  entity_id: '56',
  run_id: 56,
  source_name: 'SQL demo',
  reason:
    "count=2; changes=[customers.customer_id[v2]: HMAC -> MASK (reason: 'Không cần nối bảng'); " +
    "customers.full_name[v2]: MASK -> MASK (reason: 'DPO accepted suggested MASK policy for full_name')]",
  created_at: '2026-10-16T05:10:00Z',
  prev_hash: 'a'.repeat(64),
  entry_hash: 'b'.repeat(64),
};

const loginEvent: AuditEvent = {
  ...saveEvent,
  id: 41,
  action: 'login',
  entity_type: 'session',
  entity_id: '1',
  run_id: null,
  source_name: null,
  reason: 'User dpo authenticated successfully',
};

function renderDrawer(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <AuditEventDrawer event={saveEvent} open onClose={onClose} />
    </MemoryRouter>,
  );
  return onClose;
}

describe('AuditEventDrawer', () => {
  it('explains the event in plain words and lists only the changed columns first', () => {
    renderDrawer();

    expect(screen.getByText('Đổi 1 cột — customer_id: Băm HMAC → Che dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('1 cột đã đổi')).toBeInTheDocument();
    expect(screen.getByText('customers.customer_id')).toBeInTheDocument();
    expect(screen.queryByText('customers.full_name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem cả 2 cột' }));
    expect(screen.getByText('customers.full_name')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lượt quét #56' })).toHaveAttribute('href', '/dpo/runs/56');
  });

  it('keeps the hashes one click away', () => {
    renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'Bằng chứng chống sửa' }));
    expect(screen.getByText(saveEvent.entry_hash)).toBeInTheDocument();
    expect(screen.getByText(saveEvent.prev_hash)).toBeInTheDocument();
  });

  it('closes from the close button', () => {
    const onClose = renderDrawer();
    fireEvent.click(screen.getByLabelText('Đóng chi tiết'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('AuditActivityTable', () => {
  it('shows one readable row per event and opens it on click', () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <AuditActivityTable events={[saveEvent, loginEvent]} onSelect={onSelect} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Lưu quyết định')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập thành công')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lượt quét #56' })).toBeInTheDocument();
    expect(screen.queryByText(/count=2/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Đăng nhập thành công'));
    expect(onSelect).toHaveBeenCalledWith(loginEvent);
  });
});
