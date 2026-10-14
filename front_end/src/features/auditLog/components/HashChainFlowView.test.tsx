import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '../api/auditApi';
import { HashChainFlowView } from './HashChainFlowView';

const mockEvents: AuditEvent[] = [
  {
    id: 1,
    actor_id: 1,
    actor_username: 'dpo',
    role: 'DPO',
    action: 'POLICY_APPROVAL',
    entity_type: 'run',
    entity_id: '1',
    reason: 'Phê duyệt chính sách bảo vệ',
    created_at: '2026-10-14T10:00:00Z',
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    entry_hash: '1111111111111111111111111111111111111111111111111111111111111111',
  },
  {
    id: 2,
    actor_id: 1,
    actor_username: 'dpo',
    role: 'DPO',
    action: 'PUBLISH',
    entity_type: 'dataset',
    entity_id: '1',
    reason: 'Phát hành snapshot an toàn',
    created_at: '2026-10-14T10:15:00Z',
    prev_hash: '1111111111111111111111111111111111111111111111111111111111111111',
    entry_hash: '2222222222222222222222222222222222222222222222222222222222222222',
  },
];

describe('HashChainFlowView', () => {
  it('renders blocks with ID and cryptographic hashes', () => {
    render(<HashChainFlowView events={mockEvents} onSelectBlock={vi.fn()} />);

    expect(screen.getByText('KHỐI #1')).toBeInTheDocument();
    expect(screen.getByText('KHỐI #2')).toBeInTheDocument();
    expect(screen.getAllByText(/Xem băm SHA-256/i)).toHaveLength(2);
  });

  it('calls onSelectBlock when clicking on SHA-256 button', () => {
    const handleSelect = vi.fn();
    render(<HashChainFlowView events={mockEvents} onSelectBlock={handleSelect} />);

    const buttons = screen.getAllByText(/Xem băm SHA-256/i);
    fireEvent.click(buttons[0]!);

    expect(handleSelect).toHaveBeenCalledWith(mockEvents[0]);
  });
});
