import { vi } from 'vitest';

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
};

export const mockSession = {
  user: mockUser,
};

/**
 * Create a mock for getSession that returns a session by default.
 * Call .setAuthenticated(false) to simulate logged-out state.
 */
export function createMockSession() {
  let session: { user: typeof mockUser } | null = mockSession;

  const getSession = vi.fn().mockImplementation(async () => session);

  return {
    getSession,
    setAuthenticated(authed: boolean) {
      session = authed ? mockSession : null;
    },
    setUser(user: Partial<typeof mockUser>) {
      session = { user: { ...mockUser, ...user } };
    },
    reset() {
      session = mockSession;
      getSession.mockClear();
    },
  };
}

export const mockSessionHelper = createMockSession();
