import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Nd13RulesView } from './Nd13RulesView';

describe('Nd13RulesView', () => {
  it('renders page header and tabs', () => {
    render(<Nd13RulesView />);

    expect(screen.getByText('Nghị định 13 & Luật BV DLCN 2025')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Phân loại PII & Sàn kỹ thuật/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Điều khoản luật trọng yếu/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ma trận hành động bảo vệ/i })).toBeInTheDocument();
  });

  it('filters rules using search input', () => {
    render(<Nd13RulesView />);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm điều khoản/i);
    fireEvent.change(searchInput, { target: { value: 'Nhạy cảm' } });

    expect(screen.getByText(/Dữ liệu cá nhân Nhạy cảm/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu cá nhân Cơ bản/i)).not.toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<Nd13RulesView />);

    const articlesTab = screen.getByRole('tab', { name: /Điều khoản luật trọng yếu/i });
    fireEvent.click(articlesTab);

    expect(screen.getByText('Điều 9')).toBeInTheDocument();
    expect(screen.getByText('Quyền của chủ thể dữ liệu')).toBeInTheDocument();
  });
});
