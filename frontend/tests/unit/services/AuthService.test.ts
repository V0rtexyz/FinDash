import { AuthService } from '../../../src/services/AuthService';

jest.mock('crypto-js', () => ({
  default: {
    AES: {
      encrypt: jest.fn((text: string) => ({
        toString: () => `encrypted_${text}`,
      })),
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should encrypt password during login', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: { id: '1', email: 'test@test.com' },
      }),
    });
    global.fetch = mockFetch;

    await AuthService.login({ login: 'test@test.com', password: 'test123' });
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.password).toBeDefined();
    expect(body.password).not.toBe('test123');
  });

  test('should store and retrieve token', () => {
    const token = 'test-token';
    localStorage.setItem('token', token);
    expect(AuthService.getToken()).toBe(token);
  });

  test('should return null when token is not set', () => {
    expect(AuthService.getToken()).toBeNull();
  });

  test('isAuthenticated should return false when no token', () => {
    expect(AuthService.isAuthenticated()).toBe(false);
  });

  test('isAuthenticated should return true when token exists', () => {
    localStorage.setItem('token', 'test-token');
    expect(AuthService.isAuthenticated()).toBe(true);
  });

  test('logout should clear token and user', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', '{"id":"1"}');
    AuthService.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});

