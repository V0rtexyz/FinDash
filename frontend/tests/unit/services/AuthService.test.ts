import { AuthService } from "../../../src/services/AuthService";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("AuthService", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockClear();
  });

  test("should call API during login", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Login successful",
        userId: 1,
        userName: "test@test.com",
      }),
    });

    await AuthService.login({ login: "test@test.com", password: "test123" });
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain("/api/auth/login");
    const body = JSON.parse(callArgs[1].body);
    expect(body.login).toBe("test@test.com");
    expect(body.password).toBeDefined();
  });

  test("should store token after successful login", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Login successful",
        userId: 1,
        userName: "testuser",
      }),
    });

    await AuthService.login({ login: "test@test.com", password: "test123" });
    expect(AuthService.getToken()).not.toBeNull();
    expect(AuthService.isAuthenticated()).toBe(true);
  });

  test("should throw error on failed login", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        message: "Invalid credentials",
      }),
    });

    await expect(
      AuthService.login({ login: "test@test.com", password: "wrong" })
    ).rejects.toThrow();
  });

  test("should store and retrieve token", () => {
    const token = "test-token";
    localStorage.setItem("token", token);
    expect(AuthService.getToken()).toBe(token);
  });

  test("should return null when token is not set", () => {
    expect(AuthService.getToken()).toBeNull();
  });

  test("isAuthenticated should return false when no token", () => {
    expect(AuthService.isAuthenticated()).toBe(false);
  });

  test("isAuthenticated should return true when token exists", () => {
    localStorage.setItem("token", "test-token");
    expect(AuthService.isAuthenticated()).toBe(true);
  });

  test("logout should clear token and user", () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("user", '{"id":"1"}');
    AuthService.logout();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  test("should throw 401 with custom message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid credentials" }),
    });

    await expect(
      AuthService.login({ login: "user", password: "wrong" })
    ).rejects.toThrow("Invalid credentials");
  });

  test("should throw 500 server error on login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(
      AuthService.login({ login: "user", password: "pass" })
    ).rejects.toThrow(/Ошибка сервера/);
  });

  test("should throw when login success but no userId/userName", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "OK",
        userId: undefined,
        userName: undefined,
      }),
    });

    await expect(
      AuthService.login({ login: "user", password: "pass" })
    ).rejects.toThrow();
  });

  test("should register successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "Registered",
        userId: 2,
      }),
    });

    const result = await AuthService.register({
      login: "newuser",
      password: "pass123",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/register"),
      expect.any(Object)
    );
  });

  test("should throw 400 on register failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "User already exists" }),
    });

    await expect(
      AuthService.register({ login: "exists", password: "pass" })
    ).rejects.toThrow();
  });

  test("should throw 500 on register server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(
      AuthService.register({ login: "user", password: "pass" })
    ).rejects.toThrow(/Ошибка сервера/);
  });
});
