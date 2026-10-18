import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatasetNameDialog } from './DatasetNameDialog';

const renderDialog = (onConfirm = vi.fn()) => {
  render(
    <DatasetNameDialog
      open
      title="Đặt tên dữ liệu cho Analyst"
      confirmLabel="Lưu"
      initialName="Dtb Phúc – customers, orders"
      onConfirm={onConfirm}
      onClose={vi.fn()}
    />,
  );
  return onConfirm;
};

describe('DatasetNameDialog', () => {
  it('offers the suggested name and saves the cleaned one', () => {
    const onConfirm = renderDialog();
    const input = screen.getByRole('textbox', { name: 'Tên dataset' });
    expect(input).toHaveValue('Dtb Phúc – customers, orders');

    fireEvent.change(input, { target: { value: '  Doanh thu   Q3 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onConfirm).toHaveBeenCalledWith('Doanh thu Q3');
  });

  it('does not save an empty name', () => {
    const onConfirm = renderDialog();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên dataset' }), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled();
    expect(screen.getByText('Nhập tên dataset.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
