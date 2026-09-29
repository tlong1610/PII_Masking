import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { saveStoredSession } from '../model/authStorage';
import { RequireRole } from './RequireRole';

function mockCurrentUser(role: 'DPO' | 'ANALYST'): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ username: role === 'DPO' ? 'dpo' : 'analyst', role }),
  } as Response);
}

function renderRoutes(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route
            path="/dpo"
            element={
              <RequireRole role="DPO">
                <div>DPO workspace</div>
              </RequireRole>
            }
          />
          <Route
            path="/analyst"
            element={
              <RequireRole role="Analyst">
                <div>Analyst workspace</div>
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    renderRoutes('/dpo');

    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('blocks Analyst users from DPO-only routes', async () => {
    saveStoredSession({
      token: 'server-issued-token',
      user: { username: 'analyst', role: 'Analyst' },
    });
    mockCurrentUser('ANALYST');

    renderRoutes('/dpo');

    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
    expect(screen.queryByText('DPO workspace')).not.toBeInTheDocument();
  });

  it('allows DPO users to open DPO routes', async () => {
    saveStoredSession({
      token: 'server-issued-token',
      user: { username: 'dpo', role: 'DPO' },
    });
    mockCurrentUser('DPO');

    renderRoutes('/dpo');

    expect(await screen.findByText('DPO workspace')).toBeInTheDocument();
  });
});
