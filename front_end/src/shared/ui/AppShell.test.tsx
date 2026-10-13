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

    expect(screen.getByText('PIIGuard Shield')).toBeInTheDocument();
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

  it('renders workspace pages as links and marks the current one active', () => {
    render(
      <MemoryRouter initialEntries={['/dpo/datasets']}>
        <AppShell
          activeRole="DPO"
          currentUser={{ username: 'dpo', role: 'DPO' }}
          navItems={[
            { label: 'Quét & duyệt', to: '/dpo', icon: null, end: true },
            { label: 'Dataset đã bảo vệ', to: '/dpo/datasets', icon: null },
          ]}
        >
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Dataset đã bảo vệ' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Quét & duyệt' })).not.toHaveClass('active');
    // A single-role user has nothing to switch to, so no workspace link duplicates "Quét & duyệt".
    expect(screen.queryByRole('link', { name: 'DPO' })).not.toBeInTheDocument();
    expect(screen.queryByText('Không gian làm việc')).not.toBeInTheDocument();
  });

  it('collapses the menu to icons and remembers the choice', () => {
    localStorage.removeItem('piiguard.navCollapsed');
    render(
      <MemoryRouter>
        <AppShell activeRole="DPO" currentUser={{ username: 'dpo', role: 'DPO' }}>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn menu' }));

    expect(screen.getByRole('button', { name: 'Mở rộng menu' })).toHaveAttribute('aria-expanded', 'false');
    // Links stay reachable by name while only icons are shown.
    expect(screen.getByRole('link', { name: 'DPO' })).toBeInTheDocument();
    expect(localStorage.getItem('piiguard.navCollapsed')).toBe('1');
    localStorage.removeItem('piiguard.navCollapsed');
  });

  it('hides DPO navigation for Analyst users', () => {
    render(
      <MemoryRouter>
        <AppShell activeRole="Analyst" currentUser={{ username: 'analyst', role: 'Analyst' }}>
          <div>Analyst Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'DPO' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Analyst' })).toBeInTheDocument();
  });
});
