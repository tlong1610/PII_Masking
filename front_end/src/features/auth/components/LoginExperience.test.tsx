import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthProvider';
import { LoginExperience } from './LoginExperience';

describe('LoginExperience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoginExperience />
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
});
