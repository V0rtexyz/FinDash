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

  test("should handle login with server error (500)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: "Internal server error",
      }),
    });

    await expect(
      AuthService.login({ login: "test@test.com", password: "test123" })
    ).rejects.toThrow("Ошибка сервера. Попробуйте позже");
  });

  test("should handle login when response success is false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: "Login failed",
      }),
    });

    await expect(
      AuthService.login({ login: "test@test.com", password: "test123" })
    ).rejects.toThrow("Login failed");
  });

  test("should successfully register new user", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "User registered successfully",
        userId: 1,
        userName: "newuser@test.com",
      }),
    });

    const result = await AuthService.register({
      login: "newuser@test.com",
      password: "newpass123",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("User registered successfully");
  });

  test("should handle registration error (400)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: "User already exists",
      }),
    });

    await expect(
      AuthService.register({ login: "existing@test.com", password: "pass123" })
    ).rejects.toThrow("User already exists");
  });

  test("should handle registration server error (500)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: "Database error",
      }),
    });

    await expect(
      AuthService.register({ login: "test@test.com", password: "pass123" })
    ).rejects.toThrow("Ошибка сервера. Попробуйте позже");
  });

  test("should handle registration with generic error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        message: "Forbidden",
      }),
    });

    await expect(
      AuthService.register({ login: "test@test.com", password: "pass123" })
    ).rejects.toThrow("Forbidden");
  });

  test("should handle login with json parse error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await expect(
      AuthService.login({ login: "test@test.com", password: "pass123" })
    ).rejects.toThrow();
  });

  test("should handle registration with json parse error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await expect(
      AuthService.register({ login: "test@test.com", password: "pass123" })
    ).rejects.toThrow();
  });

  test("should handle login when userId is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Login successful",
        userName: "test",
      }),
    });

    await expect(
      AuthService.login({ login: "test@test.com", password: "pass123" })
    ).rejects.toThrow();
  });

  test("should handle login when userName is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Login successful",
        userId: 1,
      }),
    });

    await expect(
      AuthService.login({ login: "test@test.com", password: "pass123" })
    ).rejects.toThrow();
  });
});
