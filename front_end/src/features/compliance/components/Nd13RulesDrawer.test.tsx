import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Nd13RulesDrawer } from './Nd13RulesDrawer';

describe('Nd13RulesDrawer', () => {
  it('renders title and tabs when open', () => {
    render(<Nd13RulesDrawer open={true} onClose={vi.fn()} />);

    expect(screen.getByText('Cẩm nang Nghị định 13')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Phân loại PII/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Điều khoản luật/i })).toBeInTheDocument();
  });

  it('filters classification rules based on search input', () => {
    render(<Nd13RulesDrawer open={true} onClose={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Tìm quy định/i);
    fireEvent.change(searchInput, { target: { value: 'Nhạy cảm' } });

    expect(screen.getByText(/Dữ liệu cá nhân Nhạy cảm/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu cá nhân Cơ bản/i)).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Nd13RulesDrawer open={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Đóng cẩm nang');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledOnce();
  });
});
