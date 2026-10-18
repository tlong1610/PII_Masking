import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddSourceDialog } from './AddSourceDialog';

const testMutation = { mutateAsync: vi.fn(), isPending: false };
const createMutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock('../hooks/usePiiReview', () => ({
  useTestDataSource: () => testMutation,
  useCreateDataSource: () => createMutation,
}));

function fill(): void {
  fireEvent.change(screen.getByLabelText('Tên nguồn dữ liệu'), { target: { value: 'Corp DB' } });
  fireEvent.change(screen.getByLabelText('URL kết nối'), {
    target: { value: 'postgresql://u:p@db.example.com:5432/shop' },
  });
}

describe('AddSourceDialog', () => {
  it('does not ask for table names before the source is connected', () => {
    render(<AddSourceDialog open onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByLabelText(/Bảng cần quét/)).toBeNull();
    expect(screen.getByText(/Chọn phạm vi/)).toBeTruthy();
  });

  it('offers the schemas found by the connection test as a list', async () => {
    testMutation.mutateAsync.mockResolvedValueOnce({
      ok: true,
      engine: 'postgresql',
      message: 'Connection OK',
      namespaces: ['public', 'sales'],
      default_namespace: 'public',
    });
    createMutation.mutateAsync.mockResolvedValueOnce({ id: 'usr-1' });
    render(<AddSourceDialog open onClose={vi.fn()} onCreated={vi.fn()} />);
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối' }));
    const schema = await screen.findByRole('combobox', { name: 'Schema' });
    expect(schema.textContent).toBe('public');

    fireEvent.mouseDown(schema);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'sales' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu & kết nối' }));

    await waitFor(() => expect(createMutation.mutateAsync).toHaveBeenCalled());
    expect(createMutation.mutateAsync.mock.calls[0]?.[0]).toMatchObject({ namespace: 'sales', tables: [] });
  });
});
