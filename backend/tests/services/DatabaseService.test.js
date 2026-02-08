import { describe, it, expect, beforeEach } from "@jest/globals";
import DatabaseService from "../../services/DatabaseService.js";

describe("DatabaseService", () => {
  let service;

  beforeEach(() => {
    // Reset environment variables to force mock mode
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
  });

  describe("Initialization", () => {
    it("should initialize in mock mode when DB not configured", () => {
      service = new DatabaseService();

      expect(service.usePostgres).toBeFalsy();
      expect(service.users).toBeDefined();
      expect(service.users.length).toBeGreaterThan(0);
    });
  });

  describe("User operations (mock mode)", () => {
    beforeEach(() => {
      service = new DatabaseService();
    });

    describe("findUserByLogin", () => {
      it("should find existing user", async () => {
        const user = await service.findUserByLogin("admin");

        expect(user).toBeDefined();
        expect(user.login).toBe("admin");
        expect(user.passwordHash).toBeDefined();
      });

      it("should return null for non-existent user", async () => {
        const user = await service.findUserByLogin("nonexistent");

        expect(user).toBeNull();
      });
    });

    describe("findUserById", () => {
      it("should find user by id", async () => {
        const user = await service.findUserById(1);

        expect(user).toBeDefined();
        expect(user.id).toBe(1);
      });

      it("should return null for invalid id", async () => {
        const user = await service.findUserById(9999);

        expect(user).toBeNull();
      });
    });

    describe("createUser", () => {
      it("should create new user", async () => {
        const newUser = await service.createUser("newuser", "hash123");

        expect(newUser).toBeDefined();
        expect(newUser.login).toBe("newuser");
        expect(newUser.passwordHash).toBe("hash123");
        expect(newUser.id).toBeGreaterThan(0);
      });

      it("should assign unique ids", async () => {
        const user1 = await service.createUser("user1", "hash1");
        const user2 = await service.createUser("user2", "hash2");

        expect(user1.id).not.toBe(user2.id);
      });
    });
  });

  describe("Favorites operations (mock mode)", () => {
    beforeEach(() => {
      service = new DatabaseService();
    });

    describe("getUserFavorites", () => {
      it("should return empty array for user with no favorites", async () => {
        const favorites = await service.getUserFavorites(1);

        expect(favorites).toEqual([]);
      });

      it("should return favorites for user", async () => {
        await service.addFavorite(1, "currency", "BTC");
        const favorites = await service.getUserFavorites(1);

        expect(favorites).toHaveLength(1);
        expect(favorites[0].symbol).toBe("BTC");
      });

      it("should filter by type", async () => {
        await service.addFavorite(1, "currency", "BTC");
        await service.addFavorite(1, "stock", "AAPL");

        const currencies = await service.getUserFavorites(1, "currency");
        expect(currencies).toHaveLength(1);
        expect(currencies[0].type).toBe("currency");
      });
    });

    describe("addFavorite", () => {
      it("should add favorite", async () => {
        const favorite = await service.addFavorite(1, "currency", "BTC");

        expect(favorite).toBeDefined();
        expect(favorite.userId).toBe(1);
        expect(favorite.type).toBe("currency");
        expect(favorite.symbol).toBe("BTC");
      });

      it("should not add duplicate favorite", async () => {
        await service.addFavorite(1, "currency", "BTC");
        const duplicate = await service.addFavorite(1, "currency", "BTC");

        expect(duplicate).toBeNull();
      });
    });

    describe("removeFavorite", () => {
      it("should remove favorite", async () => {
        await service.addFavorite(1, "currency", "BTC");
        const removed = await service.removeFavorite(1, "currency", "BTC");

        expect(removed).toBe(true);

        const favorites = await service.getUserFavorites(1);
        expect(favorites).toHaveLength(0);
      });

      it("should return false for non-existent favorite", async () => {
        const removed = await service.removeFavorite(1, "currency", "NONE");

        expect(removed).toBe(false);
      });
    });
  });

  describe("Reports operations (mock mode)", () => {
    beforeEach(() => {
      service = new DatabaseService();
    });

    describe("createReport", () => {
      it("should create report", async () => {
        const reportData = {
          type: "currency_comparison",
          data: { symbols: ["BTC", "ETH"] },
        };

        const report = await service.createReport(1, reportData);

        expect(report).toBeDefined();
        expect(report.userId).toBe(1);
        expect(report.type).toBe("currency_comparison");
        expect(report.data).toEqual(reportData.data);
      });
    });

    describe("getUserReports", () => {
      it("should return empty array for user with no reports", async () => {
        const reports = await service.getUserReports(1);

        expect(reports).toEqual([]);
      });

      it("should return user reports", async () => {
        await service.createReport(1, {
          type: "test",
          data: { foo: "bar" },
        });

        const reports = await service.getUserReports(1);

        expect(reports).toHaveLength(1);
        expect(reports[0].type).toBe("test");
      });
    });
  });

  describe("Generic query method", () => {
    beforeEach(() => {
      service = new DatabaseService();
    });

    it("should handle SELECT query for users", async () => {
      const result = await service.query(
        "SELECT * FROM users WHERE login = ?",
        ["admin"]
      );

      expect(result).toHaveLength(1);
      expect(result[0].login).toBe("admin");
    });

    it("should handle INSERT query", async () => {
      const result = await service.query(
        "INSERT INTO users (login, passwordHash) VALUES (?, ?)",
        ["testuser", "hash"]
      );

      expect(result.insertId).toBeGreaterThan(0);
    });

    it("should return empty array for unsupported queries", async () => {
      const result = await service.query("UPDATE users SET ...", []);

      expect(result).toEqual([]);
    });
  });

  describe("Helper methods", () => {
    beforeEach(() => {
      service = new DatabaseService();
    });

    describe("normalizeUserRow", () => {
      it("should normalize PostgreSQL row with lowercase fields", () => {
        const row = {
          id: 1,
          login: "test",
          passwordhash: "hash123",
          createdat: "2024-01-01",
        };

        const normalized = service.normalizeUserRow(row);

        expect(normalized.passwordHash).toBe("hash123");
        expect(normalized.createdAt).toBe("2024-01-01");
      });

      it("should handle snake_case fields", () => {
        const row = {
          id: 1,
          login: "test",
          password_hash: "hash123",
          created_at: "2024-01-01",
        };

        const normalized = service.normalizeUserRow(row);

        expect(normalized.passwordHash).toBe("hash123");
        expect(normalized.createdAt).toBe("2024-01-01");
      });

      it("should handle camelCase fields", () => {
        const row = {
          id: 1,
          login: "test",
          passwordHash: "hash123",
          createdAt: "2024-01-01",
        };

        const normalized = service.normalizeUserRow(row);

        expect(normalized.passwordHash).toBe("hash123");
        expect(normalized.createdAt).toBe("2024-01-01");
      });

      it("should return null for null input", () => {
        const normalized = service.normalizeUserRow(null);

        expect(normalized).toBeNull();
      });
    });

    describe("close", () => {
      it("should handle mock mode gracefully", async () => {
        service = new DatabaseService();

        await expect(service.close()).resolves.not.toThrow();
      });
    });
  });

  describe("initMockData", () => {
    it("should initialize default test users", () => {
      service = new DatabaseService();

      expect(service.users).toHaveLength(3);
      expect(service.users[0].login).toBe("admin");
      expect(service.users[1].login).toBe("user");
      expect(service.users[2].login).toBe("test@example.com");
    });

    it("should not reinitialize if already initialized", () => {
      service = new DatabaseService();
      const originalLength = service.users.length;

      service.initMockData();

      expect(service.users).toHaveLength(originalLength);
    });
  });
});

