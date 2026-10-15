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

    expect(screen.getByText('0987654321')).toBeInTheDocument();
    expect(screen.getAllByText('***').length).toBeGreaterThan(0);
  });

  it('allows selecting quick sample chips to populate input', () => {
    render(<MaskingDemoView />);

    const emailChip = screen.getByRole('button', { name: 'Địa chỉ Email' });
    fireEvent.click(emailChip);

    const input = screen.getByLabelText('Dữ liệu thử nghiệm');
    expect(input).toHaveValue('phuc.nguyen@enterprise.vn');
  });

  it('renders all 4 transformation cards and copy button for HMAC hash', () => {
    render(<MaskingDemoView />);

    expect(screen.getByText('1. GỐC (RAW)')).toBeInTheDocument();
    expect(screen.getByText('2. CHE MỜ (MASK ***)')).toBeInTheDocument();
    expect(screen.getByText('3. BĂM MẬT MÃ (HMAC)')).toBeInTheDocument();
    expect(screen.getByText('4. LOẠI BỎ (DROP)')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: 'Sao chép mã HMAC' });
    expect(copyBtn).toBeInTheDocument();
  });
});

