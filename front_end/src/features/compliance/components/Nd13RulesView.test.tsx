import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Nd13RulesView } from './Nd13RulesView';

describe('Nd13RulesView', () => {
  it('renders page header and tabs', () => {
    render(<Nd13RulesView />);

    expect(screen.getByText('Quy Định Pháp Luật & Chuẩn Bảo Vệ Dữ Liệu')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Phân loại PII \(L1 ➔ L2 ➔ L3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Điều khoản luật trọng yếu/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ma trận hành động bảo vệ/i })).toBeInTheDocument();
  });

  it('filters rules using search input', () => {
    render(<Nd13RulesView />);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm quy định pháp luật/i);
    fireEvent.change(searchInput, { target: { value: 'Nhạy cảm' } });

    expect(screen.getByText('Dữ liệu cá nhân Nhạy cảm (Sensitive PII)')).toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu cá nhân Cơ bản/i)).not.toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<Nd13RulesView />);

    const articlesTab = screen.getByRole('tab', { name: /Điều khoản luật trọng yếu/i });
    fireEvent.click(articlesTab);

    expect(screen.getByText('Điều 9')).toBeInTheDocument();
    expect(screen.getByText('Quyền của chủ thể dữ liệu')).toBeInTheDocument();
  });

  it('renders 2 primary legal sources with external links opening in new tab', () => {
    render(<Nd13RulesView />);

    expect(screen.getByText('Văn Bản Pháp Luật Nguồn & Dẫn Chứng Trực Tiếp')).toBeInTheDocument();
    expect(screen.getByText('2 Luật Chủ Lực')).toBeInTheDocument();
    expect(screen.getByText('Luật số 91/2025/QH15')).toBeInTheDocument();
    expect(screen.getByText('Nghị định 356/2025/NĐ-CP')).toBeInTheDocument();

    const lawLink = screen.getByRole('link', { name: /Đọc toàn văn Luật số 91\/2025\/QH15 trên web/i });
    expect(lawLink).toHaveAttribute('href', expect.stringContaining('thuvienphapluat.vn'));
    expect(lawLink).toHaveAttribute('target', '_blank');
    expect(lawLink).toHaveAttribute('rel', 'noopener noreferrer');

    const decreeLink = screen.getByRole('link', { name: /Đọc toàn văn Nghị định 356\/2025\/NĐ-CP trên web/i });
    expect(decreeLink).toHaveAttribute('href', expect.stringContaining('thuvienphapluat.vn'));
    expect(decreeLink).toHaveAttribute('target', '_blank');
    expect(decreeLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders citation and web source links on key articles tab', () => {
    render(<Nd13RulesView />);

    const articlesTab = screen.getByRole('tab', { name: /Điều khoản luật trọng yếu/i });
    fireEvent.click(articlesTab);

    const articleLinks = screen.getAllByRole('link', { name: /Xem văn bản gốc/i });
    expect(articleLinks.length).toBeGreaterThan(0);
    expect(articleLinks[0]).toHaveAttribute('href', expect.stringContaining('thuvienphapluat.vn'));
    expect(articleLinks[0]).toHaveAttribute('target', '_blank');
  });

  it('renders protection matrix table ordered strictly as L1 -> L2 -> L3 with action chips', () => {
    render(<Nd13RulesView />);

    const matrixTab = screen.getByRole('tab', { name: /Ma trận hành động bảo vệ/i });
    fireEvent.click(matrixTab);

    expect(screen.getByRole('table', { name: /Ma trận hành động bảo vệ PII/i })).toBeInTheDocument();

    const cells = screen.getAllByRole('cell');
    const cellTexts = cells.map((cell) => cell.textContent ?? '');

    const l1Index = cellTexts.findIndex((t) => t.includes('L1 — Gián tiếp'));
    const l2Index = cellTexts.findIndex((t) => t.includes('L2 — Cơ bản'));
    const l3Index = cellTexts.findIndex((t) => t.includes('L3 — Nhạy cảm'));

    expect(l1Index).toBeGreaterThan(-1);
    expect(l2Index).toBeGreaterThan(l1Index);
    expect(l3Index).toBeGreaterThan(l2Index);

    // Verify key action chips are present in the table
    expect(screen.getByText('Cấm tuyệt đối')).toBeInTheDocument();
    expect(screen.getByText('Cho phép')).toBeInTheDocument();
    expect(screen.getByText('Có thời hạn')).toBeInTheDocument();
  });
});

