import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { simulateHmacSha256 } from '../model/maskingDemos';
import { MaskingDemoView } from './MaskingDemoView';

describe('MaskingDemoView', () => {
  it('renders title, live sandbox, and unified matrix table', () => {
    render(<MaskingDemoView />);

    expect(screen.getByRole('heading', { name: 'Demo che dữ liệu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thử nghiệm che dữ liệu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ma trận che dữ liệu theo loại PII' })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Địa chỉ Email' }));

    expect(screen.getByLabelText('Dữ liệu thử nghiệm')).toHaveValue('nguyenvana@example.com');
  });

  it('renders all 4 transformation cards and copy button for HMAC hash', () => {
    render(<MaskingDemoView />);

    for (const title of ['1. Dữ liệu gốc', '2. Che mờ', '3. Băm mật mã', '4. Loại bỏ']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Sao chép mã HMAC' })).toBeInTheDocument();
  });

  it('shows the same HMAC in the matrix as the sandbox would compute', () => {
    render(<MaskingDemoView />);

    const table = screen.getByLabelText('Bảng đối chiếu ma trận che mờ');
    const expected = simulateHmacSha256('Nguyễn Văn A').slice(0, 12);
    expect(within(table).getByText(`${expected}…`)).toBeInTheDocument();
  });

  it('only uses synthetic sample values', () => {
    const { container } = render(<MaskingDemoView />);

    expect(container).not.toHaveTextContent('Nguyễn Văn Phúc');
    expect(container).not.toHaveTextContent('phuc.nguyen');
  });
});
