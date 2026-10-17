import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthProvider';
import { LoginExperience } from './LoginExperience';

describe('LoginExperience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderComponent = (showDemoAccounts = true) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoginExperience showDemoAccounts={showDemoAccounts} />
        </AuthProvider>
      </MemoryRouter>,
    );
  };

  it('renders username and password input fields and submit button', () => {
    renderComponent();

    expect(screen.getByLabelText(/Tài khoản/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Đăng nhập$/i })).toBeInTheDocument();
  });

  it('autofills credentials when clicking DPO preset card', () => {
    renderComponent();

    const dpoButton = screen.getByText(/DPO \/ Người duyệt dữ liệu/i);
    fireEvent.click(dpoButton);

    const usernameInput = screen.getByLabelText(/Tài khoản/i);
    const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);

    expect(usernameInput).toHaveValue('dpo');
    expect(passwordInput).toHaveValue('dpo123');
  });

  it('autofills credentials when clicking Analyst preset card', () => {
    renderComponent();

    const analystButton = screen.getByText(/Chuyên viên phân tích/i);
    fireEvent.click(analystButton);

    const usernameInput = screen.getByLabelText(/Tài khoản/i);
    const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);

    expect(usernameInput).toHaveValue('analyst');
    expect(passwordInput).toHaveValue('analyst123');
  });

  it('toggles password visibility when clicking eye button', () => {
    renderComponent();

    const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText(/Hiển thị mật khẩu/i);
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText(/Ẩn mật khẩu/i);
    fireEvent.click(hideButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('never shows demo accounts or their passwords in a release build', () => {
    renderComponent(false);

    expect(screen.queryByText(/tài khoản mẫu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dpo123|analyst123/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HOẶC NHẬP THÔNG TIN/i)).not.toBeInTheDocument();
    expect(screen.getByText('Nhập tài khoản được cấp để tiếp tục')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tài khoản/i)).not.toHaveAttribute('placeholder', expect.stringMatching(/dpo|analyst/));
  });
});
