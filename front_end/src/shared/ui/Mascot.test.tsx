import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Mascot } from './Mascot';

describe('Mascot', () => {
  it('is decorative and hidden from assistive tech without a label', () => {
    const { container } = render(<Mascot pose="scanning" size={96} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('data-pose', 'scanning');
    expect(img).toHaveAttribute('width', '96');
  });

  it('is announced with its label when it carries meaning', () => {
    render(<Mascot pose="protected" label="Dữ liệu đã được bảo vệ" />);
    const img = screen.getByRole('img', { name: 'Dữ liệu đã được bảo vệ' });
    expect(img).not.toHaveAttribute('aria-hidden');
  });

  it('uses a different asset for each pose', () => {
    const { container } = render(
      <>
        <Mascot pose="default" />
        <Mascot pose="error" />
      </>,
    );
    const [a, b] = Array.from(container.querySelectorAll('img'));
    expect(a?.getAttribute('src')).not.toBe(b?.getAttribute('src'));
  });
});
