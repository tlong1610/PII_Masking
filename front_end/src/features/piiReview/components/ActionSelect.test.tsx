import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionSelect } from './ActionSelect';

function renderSelect(onChange = vi.fn()) {
  render(
    <ActionSelect
      value="KEEP"
      onChange={onChange}
      isDisabled={(action) => action === 'KEEP'}
      getNote={(action) => (action === 'KEEP' ? 'Cấm với L3' : '')}
      ariaLabel="Hành động cho email"
    />,
  );
  return onChange;
}

describe('ActionSelect', () => {
  it('shows the selected action as plain text, not a nested chip', () => {
    renderSelect();
    const combo = screen.getByRole('combobox');
    expect(combo).toHaveTextContent('Giữ nguyên');
    expect(combo.querySelector('.MuiChip-root')).toBeNull();
  });

  it('lists every action with its note and blocks disabled ones', () => {
    renderSelect();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getAllByRole('option')).toHaveLength(5);
    const keep = listbox.getByRole('option', { name: /Giữ nguyên/ });
    expect(keep).toHaveAttribute('aria-disabled', 'true');
    expect(keep).toHaveTextContent('Cấm với L3');
  });

  it('reports the picked action', () => {
    const onChange = renderSelect();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Băm HMAC' }));
    expect(onChange).toHaveBeenCalledWith('HMAC');
  });
});
