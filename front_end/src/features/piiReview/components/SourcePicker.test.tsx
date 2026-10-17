import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Source } from '../api/realPiiReviewApi';
import { SourcePicker } from './SourcePicker';

const sources: Source[] = [
  {
    id: 'sql-demo',
    name: 'SQL demo',
    source_type: 'SQL',
    engine: 'postgresql',
    description: '',
    scope_summary: 'tables: customers, orders',
    status: 'ok',
  },
  {
    id: 'usr-1',
    name: 'Dữ liệu khách hàng',
    source_type: 'SQL',
    engine: 'postgresql',
    description: '',
    scope_summary: 'schema: public',
    status: 'ok',
  },
];

function renderPicker(props: Partial<Parameters<typeof SourcePicker>[0]> = {}) {
  const handlers = { onSelect: vi.fn(), onDelete: vi.fn(), onAdd: vi.fn(), onRefresh: vi.fn() };
  render(<SourcePicker sources={sources} selectedId="sql-demo" {...handlers} {...props} />);
  return handlers;
}

describe('SourcePicker', () => {
  it('selects a source from the searchable list', () => {
    const { onSelect } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Nguồn dữ liệu: SQL demo' }));
    fireEvent.change(screen.getByPlaceholderText('Tìm nguồn dữ liệu…'), { target: { value: 'khách' } });
    expect(screen.queryByText('tables: customers, orders', { exact: false })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Dữ liệu khách hàng'));
    expect(onSelect).toHaveBeenCalledWith('usr-1');
  });

  it('only lets user-registered sources be deleted', () => {
    const { onDelete } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Nguồn dữ liệu: SQL demo' }));
    expect(screen.queryByRole('button', { name: 'Xóa nguồn SQL demo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa nguồn Dữ liệu khách hàng' }));
    expect(onDelete).toHaveBeenCalledWith('usr-1');
  });

  it('is locked while a run is open', () => {
    renderPicker({ disabled: true });
    expect(screen.getByRole('button', { name: 'Nguồn dữ liệu: SQL demo' })).toBeDisabled();
  });
});
