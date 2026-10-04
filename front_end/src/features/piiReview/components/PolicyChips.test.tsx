import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SensitivityChip } from './PolicyChips';

describe('SensitivityChip', () => {
  it.each([
    ['NON_PERSONAL', 'Non-PII'],
    ['PERSONAL_BASIC', 'L2 • Cơ bản'],
    ['PERSONAL_CONTEXT', 'L2 • Cơ bản'],
    ['PERSONAL_SENSITIVE', 'L3 • Nhạy cảm'],
    ['UNKNOWN', 'Chưa xác định'],
    ['QUASI_IDENTIFIER', 'L1 • Gián tiếp'],
  ])('renders %s as "%s"', (classification, label) => {
    render(<SensitivityChip classification={classification} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
