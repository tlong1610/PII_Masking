import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScopeLinkWarnings } from './ScopeLinkWarnings';

const EMPTY = { missingParents: [], missingBridges: [], missingChildren: [] };

describe('ScopeLinkWarnings', () => {
  it('offers to add a missing bridge table as a link table', () => {
    const onAddLink = vi.fn();
    render(
      <ScopeLinkWarnings
        analysis={{ ...EMPTY, missingBridges: [{ table: 'user_roles', connects: ['roles', 'users'] }] }}
        linkTables={[]}
        onAddLink={onAddLink}
        onRemoveLink={vi.fn()}
      />,
    );
    expect(screen.getByText(/Mất liên kết N–N giữa roles, users/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm dạng bảng liên kết' }));
    expect(onAddLink).toHaveBeenCalledWith('user_roles');
  });

  it('lists link tables and lets the DPO remove one', () => {
    const onRemoveLink = vi.fn();
    render(
      <ScopeLinkWarnings analysis={EMPTY} linkTables={['customers']} onAddLink={vi.fn()} onRemoveLink={onRemoveLink} />,
    );
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(onRemoveLink).toHaveBeenCalledWith('customers');
  });

  it('renders nothing when no join is cut', () => {
    const { container } = render(
      <ScopeLinkWarnings analysis={EMPTY} linkTables={[]} onAddLink={vi.fn()} onRemoveLink={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
