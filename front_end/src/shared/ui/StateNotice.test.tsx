import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MascotLoader } from './MascotLoader';
import { StateNotice } from './StateNotice';

const pose = (): string | null | undefined => document.querySelector('img[data-pose]')?.getAttribute('data-pose');

describe('StateNotice', () => {
  it('shows the default mascot for an empty state and runs the action', () => {
    const onAction = vi.fn();
    render(<StateNotice kind="empty" title="Trống" description="Chưa có gì" actionLabel="Thêm" onAction={onAction} />);
    expect(pose()).toBe('default');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('shows the worried mascot and announces errors', () => {
    render(<StateNotice kind="error" title="Lỗi" description="Không tải được" />);
    expect(pose()).toBe('error');
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được');
  });

  it('lets callers pick another pose', () => {
    render(<StateNotice kind="empty" pose="awaiting" title="Chờ" description="Chờ DPO" />);
    expect(pose()).toBe('awaiting');
  });
});

describe('MascotLoader', () => {
  it('announces what is loading', () => {
    render(<MascotLoader pose="scanning" title="Đang quét…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang quét…');
    expect(pose()).toBe('scanning');
  });
});
