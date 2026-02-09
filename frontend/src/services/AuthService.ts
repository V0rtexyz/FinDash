const API_BASE_URL = "/api";

export interface LoginCredentials {
  login: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: number;
  userName?: string;
}

class AuthServiceClass {
  private hashPassword(password: string): string {
    // Use Web Crypto API for SHA-256 hashing (browser native)
    // This is a synchronous wrapper - in production you might want async
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    // Note: This is a simplified version. In production, use async crypto.subtle.digest
    // For now, we'll send plain password and let backend hash it
    return password;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Backend accepts either passwordHash (SHA256) or plain password
    // We'll send plain password and let backend hash it for consistency
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        login: credentials.login,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error(errorData.message || "Неверный логин или пароль");
      }
      if (response.status >= 500) {
        throw new Error("Ошибка сервера. Попробуйте позже");
      }
      throw new Error(errorData.message || "Ошибка авторизации");
    }

    const data: AuthResponse = await response.json();

    // Convert backend response to frontend format
    if (data.success && data.userId && data.userName) {
      // Generate a simple token (in production, backend should return JWT)
      const token = `token_${data.userId}_${Date.now()}`;
      const user = {
        id: String(data.userId),
        email: data.userName,
        name: data.userName,
      };

      // Store token and user
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      return {
        success: true,
        message: data.message,
        userId: data.userId,
        userName: data.userName,
      };
    }

    throw new Error(data.message || "Ошибка авторизации");
  }

  async register(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        login: credentials.login,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400) {
        throw new Error(errorData.message || "Ошибка регистрации");
      }
      if (response.status >= 500) {
        throw new Error("Ошибка сервера. Попробуйте позже");
      }
      throw new Error(errorData.message || "Ошибка регистрации");
    }

    const data: AuthResponse = await response.json();

    // Automatically log in after successful registration
    if (data.success && data.userId && data.userName) {
      const token = `token_${data.userId}_${Date.now()}`;
      const user = {
        id: String(data.userId),
        email: data.userName,
        name: data.userName,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }

    return data;
  }

  logout(): void {
    console.log("AuthService: Logging out");

    // Get current userId before clearing
    const userStr = localStorage.getItem("user");
    let userId: string | null = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user?.id || null;
      } catch (e) {
        // ignore
      }
    }

    // Clear auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Clear current user's data only (if we have userId)
    if (userId) {
      const historyKey = `currency_history_${userId}`;
      const favoritesKey = `currency_favorites_${userId}`;
      const trackedCurrenciesKey = `tracked_currencies_${userId}`;
      const selectedCurrencyKey = `selected_currency_${userId}`;

      console.log("AuthService: Clearing localStorage for userId:", userId);
      console.log("AuthService: Removing", historyKey);
      console.log("AuthService: Removing", favoritesKey);
      console.log("AuthService: Removing", trackedCurrenciesKey);
      console.log("AuthService: Removing", selectedCurrencyKey);

      localStorage.removeItem(historyKey);
      localStorage.removeItem(favoritesKey);
      localStorage.removeItem(trackedCurrenciesKey);
      localStorage.removeItem(selectedCurrencyKey);
    }
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const AuthService = new AuthServiceClass();
