import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppStateProvider } from '../context/AppState.jsx';
import App from '../App.jsx';
import { onExchange } from '../api/client.js';
import { mockFetch } from '../test/fixtures.js';

const USER = { user_id: 1, username: 'devadmin', role: 'administrator' };
const UNAUTH = {
  status: 401,
  body: { error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } },
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>,
  );
}

let signedIn;
beforeEach(() => {
  signedIn = false;
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/cities': { body: { cities: [] } },
      'GET /api/admin/me': () => (signedIn ? { body: { user: USER } } : UNAUTH),
      'POST /api/admin/login': ({ body }) => {
        const { password } = JSON.parse(body);
        if (password !== 'right password') {
          return {
            status: 401,
            body: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' } },
          };
        }
        signedIn = true;
        return { body: { user: USER } };
      },
      'POST /api/admin/logout': () => {
        signedIn = false;
        return { body: { status: 'ok' } };
      },
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function signIn(user, password) {
  await user.type(screen.getByLabelText('Username'), 'devadmin');
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('admin', () => {
  it('redirects to sign-in when there is no session', async () => {
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('signs in with JSON, sends cookies, and shows the dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/admin/login');
    await signIn(user, 'right password');
    expect(await screen.findByRole('heading', { name: 'Welcome, devadmin' })).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();

    const [, options] = fetch.mock.calls.find(([url]) => url === '/api/admin/login');
    expect(JSON.parse(options.body)).toEqual({ username: 'devadmin', password: 'right password' });
    expect(options.credentials).toBe('include');
  });

  it('shows the error and clears the password on a failed sign-in', async () => {
    const user = userEvent.setup();
    renderAt('/admin/login');
    await signIn(user, 'wrong password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('never exposes the password to the JSON panel', async () => {
    const seen = [];
    const stop = onExchange((e) => seen.push(e));
    const user = userEvent.setup();
    renderAt('/admin/login');
    await signIn(user, 'right password');
    await screen.findByRole('heading', { name: 'Welcome, devadmin' });
    stop();
    const login = seen.find((e) => e.path === '/api/admin/login');
    expect(login.request).toEqual({ username: 'devadmin', password: '••••••' });
    expect(JSON.stringify(seen)).not.toContain('right password');
  });

  it('signs out and returns to the sign-in page', async () => {
    signedIn = true;
    const user = userEvent.setup();
    renderAt('/admin');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await waitFor(() => expect(signedIn).toBe(false));
  });
});
