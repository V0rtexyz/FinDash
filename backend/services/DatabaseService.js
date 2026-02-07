/**
 * DatabaseService - PostgreSQL database implementation
 * Uses connection pooling for efficient database access
 */

import pkg from "pg";
const { Pool } = pkg;

export default class DatabaseService {
  constructor() {
    // Initialize PostgreSQL connection pool
    // Falls back to mock mode if DB credentials are not provided
    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // Check if we should use PostgreSQL or fallback to mock
    this.usePostgres =
      process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER;

    if (this.usePostgres) {
      this.pool = new Pool(dbConfig);

      // Handle pool errors
      this.pool.on("error", (err) => {
        console.error("Unexpected error on idle client", err);
      });
    } else {
      console.warn(
        "DatabaseService: PostgreSQL not configured; falling back to in-memory mock data"
      );
      this.initMockData();
      this.pool = null;
    }
  }

  // Initialize mock data storage
  initMockData() {
    if (!this.users) {
      this.users = [];
      this.userFavorites = [];
      this.userReports = [];
      
      // Add default test users for mock mode
      // Password: "admin" hashed with SHA256
      const adminHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
      // Password: "user" hashed with SHA256
      const userHash = '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb';
      // Password: "test123" hashed with SHA256
      const testHash = 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae';
      
      this.users.push({
        id: 1,
        login: 'admin',
        passwordHash: adminHash,
        createdAt: new Date().toISOString(),
      });
      
      this.users.push({
        id: 2,
        login: 'user',
        passwordHash: userHash,
        createdAt: new Date().toISOString(),
      });
      
      this.users.push({
        id: 3,
        login: 'test@example.com',
        passwordHash: testHash,
        createdAt: new Date().toISOString(),
      });
      
      console.log('DatabaseService: Mock mode initialized with test users');
      console.log('Test users: admin/admin, user/user, test@example.com/test123');
    }
  }

  // Optional initialization: test DB connection
  async init() {
    if (!this.pool) {
      console.warn(
        "DatabaseService.init: no pool - running in mock/fallback mode"
      );
      return;
    }

    try {
      const res = await this.pool.query("SELECT 1 as ok");
      console.log(
        "DatabaseService.init: DB connectivity check OK",
        res ? true : false
      );
    } catch (err) {
      console.error(
        "DatabaseService.init: DB connectivity check failed:",
        err.message || err
      );
      // Rethrow so calling code can fallback or exit
      throw err;
    }
  }

  // Normalize PostgreSQL row (column names may be lowercased: passwordhash, createdat)
  normalizeUserRow(row) {
    if (!row) return row;
    return {
      id: row.id,
      login: row.login,
      passwordHash: row.passwordHash ?? row.passwordhash ?? row.password_hash,
      createdAt: row.createdAt ?? row.createdat ?? row.created_at,
    };
  }

  // User operations
  async findUserByLogin(login) {
    if (!this.usePostgres) {
      const user = this.users.find((u) => u.login === login);
      return user || null;
    }

    try {
      const result = await this.pool.query(
        'SELECT id, login, passwordhash AS "passwordHash", createdat AS "createdAt" FROM users WHERE login = $1',
        [login]
      );
      // log for troubleshooting (do not log raw password hash in production)
      if (result.rows.length > 0) {
        const row = this.normalizeUserRow(result.rows[0]);
        console.debug(
          `DatabaseService.findUserByLogin: found user ${row.login} (id=${row.id})`
        );
        return row;
      }
      console.debug(
        `DatabaseService.findUserByLogin: user not found for login='${login}'`
      );
      return null;
    } catch (error) {
      // If connection error, fallback to mock mode
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn(
          "DatabaseService.findUserByLogin: DB connection failed, falling back to mock mode"
        );
        this.usePostgres = false;
        this.initMockData();
        const user = this.users.find((u) => u.login === login);
        return user || null;
      }
      console.error("DatabaseService.findUserByLogin error:", error);
      throw error;
    }
  }

  async findUserById(id) {
    if (!this.usePostgres) {
      const user = this.users.find((u) => u.id === id);
      return user || null;
    }

    try {
      const result = await this.pool.query(
        'SELECT id, login, passwordhash AS "passwordHash", createdat AS "createdAt" FROM users WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? this.normalizeUserRow(result.rows[0]) : null;
    } catch (error) {
      console.error("DatabaseService.findUserById error:", error);
      throw error;
    }
  }

  async createUser(login, passwordHash) {
    if (!this.usePostgres) {
      const newUser = {
        id: Math.max(...this.users.map((u) => u.id), 0) + 1,
        login,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      this.users.push(newUser);
      return newUser;
    }

    try {
      const result = await this.pool.query(
        'INSERT INTO users (login, passwordhash, createdat) VALUES ($1, $2, NOW()) RETURNING id, login, passwordhash AS "passwordHash", createdat AS "createdAt"',
        [login, passwordHash]
      );
      return this.normalizeUserRow(result.rows[0]);
    } catch (error) {
      // If connection error, fallback to mock mode
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn(
          "DatabaseService.createUser: DB connection failed, falling back to mock mode"
        );
        this.usePostgres = false;
        this.initMockData();
        const newUser = {
          id: Math.max(...this.users.map((u) => u.id), 0) + 1,
          login,
          passwordHash,
          createdAt: new Date().toISOString(),
        };
        this.users.push(newUser);
        return newUser;
      }
      console.error("DatabaseService.createUser error:", error);
      throw error;
    }
  }

  // Favorites operations
  async getUserFavorites(userId, type = null) {
    if (!this.usePostgres) {
      let favorites = this.userFavorites.filter((f) => f.userId === userId);
      if (type) {
        favorites = favorites.filter((f) => f.type === type);
      }
      return favorites;
    }

    try {
      let query =
        "SELECT id, userId, type, symbol, createdAt FROM user_favorites WHERE userId = $1";
      const params = [userId];

      if (type) {
        query += " AND type = $2";
        params.push(type);
      }

      query += " ORDER BY createdAt DESC";

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("DatabaseService.getUserFavorites error:", error);
      throw error;
    }
  }

  async addFavorite(userId, type, symbol) {
    if (!this.usePostgres) {
      const exists = this.userFavorites.find(
        (f) => f.userId === userId && f.type === type && f.symbol === symbol
      );
      if (exists) {
        return null;
      }

      const newFavorite = {
        id: Math.max(...this.userFavorites.map((f) => f.id), 0) + 1,
        userId,
        type,
        symbol,
        createdAt: new Date().toISOString(),
      };
      this.userFavorites.push(newFavorite);
      return newFavorite;
    }

    try {
      // Check if already exists
      const checkResult = await this.pool.query(
        "SELECT id FROM user_favorites WHERE userId = $1 AND type = $2 AND symbol = $3",
        [userId, type, symbol]
      );

      if (checkResult.rows.length > 0) {
        return null; // Already exists
      }

      // Insert new favorite
      const result = await this.pool.query(
        "INSERT INTO user_favorites (userId, type, symbol, createdAt) VALUES ($1, $2, $3, NOW()) RETURNING id, userId, type, symbol, createdAt",
        [userId, type, symbol]
      );
      return result.rows[0];
    } catch (error) {
      console.error("DatabaseService.addFavorite error:", error);
      throw error;
    }
  }

  async removeFavorite(userId, type, symbol) {
    if (!this.usePostgres) {
      const index = this.userFavorites.findIndex(
        (f) => f.userId === userId && f.type === type && f.symbol === symbol
      );
      if (index !== -1) {
        this.userFavorites.splice(index, 1);
        return true;
      }
      return false;
    }

    try {
      const result = await this.pool.query(
        "DELETE FROM user_favorites WHERE userId = $1 AND type = $2 AND symbol = $3",
        [userId, type, symbol]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("DatabaseService.removeFavorite error:", error);
      throw error;
    }
  }

  // Reports operations
  async createReport(userId, reportData) {
    if (!this.usePostgres) {
      const newReport = {
        id: Math.max(...this.userReports.map((r) => r.id), 0) + 1,
        userId,
        ...reportData,
        createdAt: new Date().toISOString(),
      };
      this.userReports.push(newReport);
      return newReport;
    }

    try {
      const { type, data } = reportData;
      const result = await this.pool.query(
        "INSERT INTO user_reports (userId, type, data, createdAt) VALUES ($1, $2, $3, NOW()) RETURNING id, userId, type, data, createdAt",
        [userId, type, JSON.stringify(data)]
      );
      return {
        ...result.rows[0],
        data: JSON.parse(result.rows[0].data),
      };
    } catch (error) {
      console.error("DatabaseService.createReport error:", error);
      throw error;
    }
  }

  async getUserReports(userId) {
    if (!this.usePostgres) {
      return this.userReports.filter((r) => r.userId === userId);
    }

    try {
      const result = await this.pool.query(
        "SELECT id, userId, type, data, createdAt FROM user_reports WHERE userId = $1 ORDER BY createdAt DESC",
        [userId]
      );
      return result.rows.map((row) => ({
        ...row,
        data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
      }));
    } catch (error) {
      console.error("DatabaseService.getUserReports error:", error);
      throw error;
    }
  }

  // Generic query method for compatibility
  async query(sql, params) {
    if (!this.usePostgres) {
      // Mock implementation
      if (sql.includes("SELECT")) {
        if (sql.includes("FROM users") && sql.includes("WHERE login")) {
          return this.users.filter((u) => u.login === params[0]);
        }
        if (sql.includes("FROM users") && sql.includes("WHERE id")) {
          return this.users.filter((u) => u.id === params[0]);
        }
      } else if (sql.includes("INSERT")) {
        if (sql.includes("INTO users")) {
          const user = await this.createUser(params[0], params[1]);
          return { insertId: user.id };
        }
      }
      return [];
    }

    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error("DatabaseService.query error:", error);
      throw error;
    }
  }

  // Close database connection pool
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
