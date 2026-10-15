import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MaskingDemoView } from './MaskingDemoView';

describe('MaskingDemoView', () => {
  it('renders title, live sandbox, and unified matrix table', () => {
    render(<MaskingDemoView />);

    expect(screen.getByText('Demo Che Dữ Liệu (Masking Showcase)')).toBeInTheDocument();
    expect(screen.getByText(/Hộp Thử Nghiệm Che Mờ Tương Tác/i)).toBeInTheDocument();
    expect(screen.getByText(/Ma Trận Che Mờ Chuẩn Toàn Diện/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Bảng đối chiếu ma trận che mờ')).toBeInTheDocument();
  });

  it('updates masked output when input value changes in sandbox', () => {
    render(<MaskingDemoView />);

    const input = screen.getByLabelText('Dữ liệu thử nghiệm');
    fireEvent.change(input, { target: { value: '0987654321' } });

    expect(screen.getByText('098****321')).toBeInTheDocument();
  });

  it('allows selecting quick sample chips to populate input', () => {
    render(<MaskingDemoView />);

    const emailChip = screen.getByRole('button', { name: 'Địa chỉ Email' });
    fireEvent.click(emailChip);

    const input = screen.getByLabelText('Dữ liệu thử nghiệm') as HTMLInputElement;
    expect(input.value).toBe('phuc.nguyen@enterprise.vn');
  });
});
