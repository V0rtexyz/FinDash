/**
 * AuthService - Handles user authentication
 * Verifies login and password hash against the database
 */

import crypto from "crypto";

export default class AuthService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Authenticate user by login and password hash
   * @param {string} login - User login
   * @param {string} passwordHash - Hash of the password (from frontend)
   * @returns {Promise<{success: boolean, message: string, userId?: number, userName?: string}>}
   */
  async authenticate(login, passwordHashOrPlain, plainPassword = null) {
    try {
      // Validate input
      if (!login || typeof login !== "string") {
        return {
          success: false,
          message: "Invalid login provided",
        };
      }

      if (
        (!passwordHashOrPlain || typeof passwordHashOrPlain !== "string") &&
        (!plainPassword || typeof plainPassword !== "string")
      ) {
        return {
          success: false,
          message: "Invalid password or passwordHash provided",
        };
      }

      // Find user in database by login
      const user = await this.findUserByLogin(login);
      console.debug(
        `AuthService.authenticate: lookup for login='${login}': ${
          user ? "found" : "not found"
        }`
      );

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Compute what we should compare with stored hash:
      const providedHash =
        plainPassword && typeof plainPassword === "string"
          ? crypto.createHash("sha256").update(plainPassword).digest("hex")
          : passwordHashOrPlain;

      // Compare password hashes
      // WARNING: on production don't log secrets; only done minimally for troubleshooting here
      const dbHashPreview = user.passwordHash
        ? user.passwordHash.slice(0, 8) + "..."
        : "<no-hash>";
      const reqHashPreview = providedHash
        ? providedHash.slice(0, 8) + "..."
        : "<no-hash>";
      console.debug(
        `AuthService.authenticate: comparing hashes db=${dbHashPreview} req=${reqHashPreview}`
      );
      if (user.passwordHash !== providedHash) {
        return {
          success: false,
          message: "Invalid password",
        };
      }

      // Authentication successful
      return {
        success: true,
        message: "Authentication successful",
        userId: user.id,
        userName: user.login,
      };
    } catch (error) {
      console.error("AuthService.authenticate error:", error);
      return {
        success: false,
        message: "Authentication error",
      };
    }
  }

  /**
   * Find user by login in database
   * @param {string} login - User login
   * @returns {Promise<{id: number, login: string, passwordHash: string} | null>}
   */
  async findUserByLogin(login) {
    try {
      // Use database service method if available, otherwise fall back to query
      if (this.db.findUserByLogin) {
        return await this.db.findUserByLogin(login);
      }
      // Fallback to query method
      const query = "SELECT id, login, passwordHash FROM users WHERE login = ?";
      const user = await this.db.query(query, [login]);

      return user && user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error("AuthService.findUserByLogin error:", error);
      throw error;
    }
  }

  /**
   * Register a new user (optional helper method)
   * @param {string} login - User login
   * @param {string} passwordHash - Hash of the password
   * @returns {Promise<{success: boolean, message: string, userId?: number}>}
   */
  async register(login, passwordHash) {
    try {
      if (!login || typeof login !== "string") {
        return {
          success: false,
          message: "Invalid login",
        };
      }

      if (!passwordHash || typeof passwordHash !== "string") {
        return {
          success: false,
          message: "Invalid password hash",
        };
      }

      // Check if user already exists
      const existingUser = await this.findUserByLogin(login);
      if (existingUser) {
        return {
          success: false,
          message: "User already exists",
        };
      }

      // Insert new user into database
      let userId;
      if (this.db.createUser) {
        const newUser = await this.db.createUser(login, passwordHash);
        userId = newUser.id;
      } else {
        // Fallback to query method
        const query = "INSERT INTO users (login, passwordHash) VALUES (?, ?)";
        const result = await this.db.query(query, [login, passwordHash]);
        userId = result.insertId || result.lastID;
      }

      return {
        success: true,
        message: "User registered successfully",
        userId,
      };
    } catch (error) {
      console.error("AuthService.register error:", error);
      // Check if it's a database connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          message: "База данных недоступна. Пожалуйста, проверьте подключение к PostgreSQL или настройте базу данных.",
        };
      }
      return {
        success: false,
        message: error.message || "Registration error",
      };
    }
  }
}
