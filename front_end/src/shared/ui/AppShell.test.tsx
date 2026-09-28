import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders branding and role navigation', () => {
    render(
      <MemoryRouter>
        <AppShell activeRole="DPO">
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('PIIGuard VN')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders current user badge and opens logout dialog when clicked', () => {
    const onLogoutMock = vi.fn();

    render(
      <MemoryRouter>
        <AppShell
          activeRole="DPO"
          currentUser={{ username: 'dpo_admin', role: 'DPO' }}
          onLogout={onLogoutMock}
        >
          <div>Workspace Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('dpo_admin')).toBeInTheDocument();

    const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
    expect(logoutButton).toBeInTheDocument();

    fireEvent.click(logoutButton);

    // Verify confirmation dialog appears
    expect(screen.getByText('Xác nhận đăng xuất')).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc của tài khoản "dpo_admin"/i),
    ).toBeInTheDocument();

    // Click confirm logout in dialog
    const confirmButtons = screen.getAllByRole('button', { name: /Đăng xuất/i });
    const dialogConfirmBtn = confirmButtons[confirmButtons.length - 1];
    if (dialogConfirmBtn) {
      fireEvent.click(dialogConfirmBtn);
    }

    expect(onLogoutMock).toHaveBeenCalledTimes(1);
  });
});
