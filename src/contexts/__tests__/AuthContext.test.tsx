import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { API_URL, TOKEN_KEY } from '@/api/apiClient';

// ── Test helpers ──

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: 'user' as const,
  company: 'TestCo',
  name: 'Test User',
};

/** Renders a consumer component that exposes AuthContext values for assertions. */
function AuthConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onRender(auth);
  return (
    <div>
      <span data-testid="email">{auth.user?.email ?? 'none'}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
    </div>
  );
}

function renderWithAuth(onRender: (ctx: ReturnType<typeof useAuth>) => void = () => {}) {
  return render(
    <AuthProvider>
      <AuthConsumer onRender={onRender} />
    </AuthProvider>,
  );
}

// ── Setup & teardown ──

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── Tests ──

describe('AuthContext', () => {
  describe('initial unauthenticated state', () => {
    it('provides null user, isAuthenticated=false, isLoading=false when no token exists', () => {
      let captured: ReturnType<typeof useAuth> | null = null;

      renderWithAuth((ctx) => { captured = ctx; });

      expect(captured!.user).toBeNull();
      expect(captured!.isAuthenticated).toBe(false);
      expect(captured!.isLoading).toBe(false);
    });
  });

  describe('login()', () => {
    it('stores token, sets user, and returns success on valid credentials', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'jwt-abc', user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      let result: { success: boolean; user?: unknown; error?: string };
      await act(async () => {
        result = await captured!.login('test@example.com', 'password123');
      });

      expect(result!.success).toBe(true);
      expect(result!.user).toEqual(mockUser);
      expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-abc');
      expect(captured!.user).toEqual(mockUser);
      expect(captured!.isAuthenticated).toBe(true);

      // Verify fetch was called with correct endpoint and body
      expect(fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        }),
      );
    });

    it('returns error message on failed login (401)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Invalid credentials' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      let result: { success: boolean; user?: unknown; error?: string };
      await act(async () => {
        result = await captured!.login('bad@example.com', 'wrong');
      });

      expect(result!.success).toBe(false);
      expect(result!.error).toBe('Invalid credentials');
      expect(captured!.user).toBeNull();
      expect(captured!.isAuthenticated).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('returns network error when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Failed to fetch'));

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      let result: { success: boolean; user?: unknown; error?: string };
      await act(async () => {
        result = await captured!.login('test@example.com', 'password123');
      });

      expect(result!.success).toBe(false);
      expect(result!.error).toBe('Network error');
    });
  });

  describe('logout()', () => {
    it('clears token from localStorage and resets user to null', async () => {
      // First login to establish authenticated state
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'jwt-abc', user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      await act(async () => {
        await captured!.login('test@example.com', 'password123');
      });
      expect(captured!.isAuthenticated).toBe(true);

      act(() => {
        captured!.logout();
      });

      expect(captured!.user).toBeNull();
      expect(captured!.isAuthenticated).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('token validation on mount (auto-login)', () => {
    it('validates stored token and restores user session', async () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await act(async () => {
        renderWithAuth(() => {});
      });

      await waitFor(() => {
        expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Verify /auth/me was called with the stored token
      expect(fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/me`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer existing-token' },
        }),
      );
    });
  });

  describe('expired/invalid token handling', () => {
    it('clears token and sets unauthenticated state when stored token is invalid', async () => {
      localStorage.setItem(TOKEN_KEY, 'expired-token');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await act(async () => {
        renderWithAuth(() => {});
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('email')).toHaveTextContent('none');
      });

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('clears token when /auth/me fetch throws a network error', async () => {
      localStorage.setItem(TOKEN_KEY, 'some-token');

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));

      await act(async () => {
        renderWithAuth(() => {});
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('signup() (register)', () => {
    it('creates account, stores token, and auto-logs in', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'jwt-new', user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      let result: { success: boolean; user?: unknown; error?: string };
      await act(async () => {
        result = await captured!.signup('test@example.com', 'password123', 'TestCo', 'Test User', 'KR');
      });

      expect(result!.success).toBe(true);
      expect(result!.user).toEqual(mockUser);
      expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-new');
      expect(captured!.user).toEqual(mockUser);
      expect(captured!.isAuthenticated).toBe(true);

      // Verify the register endpoint was called with correct payload
      expect(fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            password_confirmation: 'password123',
            company: 'TestCo',
            name: 'Test User',
            nationality: 'KR',
          }),
        }),
      );
    });

    it('returns error on registration failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Email already taken' } }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      let result: { success: boolean; user?: unknown; error?: string };
      await act(async () => {
        result = await captured!.signup('existing@example.com', 'password123');
      });

      expect(result!.success).toBe(false);
      expect(result!.error).toBe('Email already taken');
      expect(captured!.isAuthenticated).toBe(false);
    });
  });

  describe('isAuthenticated reflects login state', () => {
    it('transitions from false -> true on login, then true -> false on logout', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'jwt-abc', user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let captured: ReturnType<typeof useAuth> | null = null;
      renderWithAuth((ctx) => { captured = ctx; });

      // Initially unauthenticated
      expect(captured!.isAuthenticated).toBe(false);

      // After login
      await act(async () => {
        await captured!.login('test@example.com', 'password123');
      });
      expect(captured!.isAuthenticated).toBe(true);

      // After logout
      act(() => {
        captured!.logout();
      });
      expect(captured!.isAuthenticated).toBe(false);
    });
  });

  describe('useAuth() outside provider', () => {
    it('throws an error when used outside AuthProvider', () => {
      // Suppress React error boundary console output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function Orphan() {
        useAuth();
        return null;
      }

      expect(() => render(<Orphan />)).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
