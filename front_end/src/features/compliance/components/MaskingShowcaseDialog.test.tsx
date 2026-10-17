import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MaskingShowcaseDialog } from './MaskingShowcaseDialog';

describe('MaskingShowcaseDialog', () => {
  it('renders showcase title and transformations when open', () => {
    render(<MaskingShowcaseDialog open={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Demo Che Dữ Liệu — Đa Chiều/i)).toBeInTheDocument();
    expect(screen.getByText('1. Dữ liệu gốc (RAW)')).toBeInTheDocument();
    expect(screen.getByText('2. Che mờ định dạng (MASK)')).toBeInTheDocument();
    expect(screen.getByText('3. Mã băm bí mật (HMAC SHA-256)')).toBeInTheDocument();
    expect(screen.getByText('4. Loại bỏ hoàn toàn (DROP)')).toBeInTheDocument();
  });

  it('switches PII type when clicking a category chip', () => {
    render(<MaskingShowcaseDialog open={true} onClose={vi.fn()} />);

    const phoneChip = screen.getByText('Số điện thoại');
    fireEvent.click(phoneChip);

    expect(screen.getByText('0912345678', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('***').length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<MaskingShowcaseDialog open={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /Đóng Showcase/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledOnce();
  });
});
