import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import crypto from "crypto";
import AuthService from "../../services/AuthService.js";

describe("AuthService", () => {
  let authService;
  let mockDatabase;

  beforeEach(() => {
    mockDatabase = {
      findUserByLogin: jest.fn(),
      createUser: jest.fn(),
      query: jest.fn(),
    };
    authService = new AuthService(mockDatabase);
  });

  describe("authenticate", () => {
    it("should successfully authenticate with valid credentials", async () => {
      const login = "testuser";
      const password = "password123";
      const passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      mockDatabase.findUserByLogin.mockResolvedValue({
        id: 1,
        login: login,
        passwordHash: passwordHash,
      });

      const result = await authService.authenticate(login, passwordHash);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Authentication successful");
      expect(result.userId).toBe(1);
      expect(result.userName).toBe(login);
    });

    it("should successfully authenticate with plain password", async () => {
      const login = "testuser";
      const password = "password123";
      const passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      mockDatabase.findUserByLogin.mockResolvedValue({
        id: 1,
        login: login,
        passwordHash: passwordHash,
      });

      const result = await authService.authenticate(login, null, password);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
    });

    it("should fail with invalid login", async () => {
      const result = await authService.authenticate("", "somehash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid login provided");
    });

    it("should fail with invalid password", async () => {
      const result = await authService.authenticate("testuser", "");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid password or passwordHash provided");
    });

    it("should fail with non-string login", async () => {
      const result = await authService.authenticate(123, "somehash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid login provided");
    });

    it("should fail when user not found", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue(null);

      const result = await authService.authenticate("nonexistent", "somehash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("User not found");
    });

    it("should fail with incorrect password", async () => {
      const login = "testuser";
      const correctHash = crypto
        .createHash("sha256")
        .update("correct")
        .digest("hex");
      const wrongHash = crypto
        .createHash("sha256")
        .update("wrong")
        .digest("hex");

      mockDatabase.findUserByLogin.mockResolvedValue({
        id: 1,
        login: login,
        passwordHash: correctHash,
      });

      const result = await authService.authenticate(login, wrongHash);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid password");
    });

    it("should handle database errors", async () => {
      mockDatabase.findUserByLogin.mockRejectedValue(
        new Error("Database error")
      );

      const result = await authService.authenticate(
        "testuser",
        "somehash"
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Authentication error");
    });
  });

  describe("findUserByLogin", () => {
    it("should find user by login using database method", async () => {
      const user = {
        id: 1,
        login: "testuser",
        passwordHash: "hash",
      };

      mockDatabase.findUserByLogin.mockResolvedValue(user);

      const result = await authService.findUserByLogin("testuser");

      expect(result).toEqual(user);
      expect(mockDatabase.findUserByLogin).toHaveBeenCalledWith("testuser");
    });

    it("should fall back to query method if findUserByLogin not available", async () => {
      delete mockDatabase.findUserByLogin;
      mockDatabase.query.mockResolvedValue([
        {
          id: 1,
          login: "testuser",
          passwordHash: "hash",
        },
      ]);

      const result = await authService.findUserByLogin("testuser");

      expect(result.id).toBe(1);
      expect(mockDatabase.query).toHaveBeenCalled();
    });

    it("should return null if user not found", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue(null);

      const result = await authService.findUserByLogin("nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error on database failure", async () => {
      mockDatabase.findUserByLogin.mockRejectedValue(
        new Error("DB Error")
      );

      await expect(
        authService.findUserByLogin("testuser")
      ).rejects.toThrow("DB Error");
    });
  });

  describe("register", () => {
    it("should successfully register new user", async () => {
      const login = "newuser";
      const passwordHash = "hash123";

      mockDatabase.findUserByLogin.mockResolvedValue(null);
      mockDatabase.createUser.mockResolvedValue({
        id: 1,
        login: login,
        passwordHash: passwordHash,
      });

      const result = await authService.register(login, passwordHash);

      expect(result.success).toBe(true);
      expect(result.message).toBe("User registered successfully");
      expect(result.userId).toBe(1);
    });

    it("should fail with invalid login", async () => {
      const result = await authService.register("", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid login");
    });

    it("should fail with invalid password hash", async () => {
      const result = await authService.register("user", "");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid password hash");
    });

    it("should fail if user already exists", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue({
        id: 1,
        login: "existinguser",
      });

      const result = await authService.register("existinguser", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("User already exists");
    });

    it("should use fallback query method if createUser not available", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue(null);
      delete mockDatabase.createUser;
      mockDatabase.query.mockResolvedValue({
        insertId: 1,
      });

      const result = await authService.register("newuser", "hash");

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
    });

    it("should handle database connection errors", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue(null);
      mockDatabase.createUser.mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const result = await authService.register("newuser", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toContain("База данных недоступна");
    });

    it("should handle general database errors", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue(null);
      mockDatabase.createUser.mockRejectedValue(
        new Error("DB constraint error")
      );

      const result = await authService.register("newuser", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("DB constraint error");
    });

    it("should handle database timeout errors", async () => {
      mockDatabase.findUserByLogin.mockResolvedValue(null);
      mockDatabase.createUser.mockRejectedValue({
        code: "ETIMEDOUT",
        message: "Connection timeout",
      });

      const result = await authService.register("newuser", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toContain("База данных недоступна");
    });
  });
});

