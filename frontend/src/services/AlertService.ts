const API_BASE = "/api";

export interface Alert {
  id: number;
  userId: number;
  type: string;
  symbol: string;
  condition: "above" | "below";
  targetValue: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Notification {
  id: number;
  userId: number;
  alertId: number | null;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface CreateAlertBody {
  symbol: string;
  type?: string;
  condition: "above" | "below";
  targetValue: number;
}

class AlertServiceClass {
  private getUserIdParam(userId: number): string {
    return `userId=${encodeURIComponent(userId)}`;
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    const res = await fetch(
      `${API_BASE}/alerts?${this.getUserIdParam(userId)}`
    );
    if (!res.ok) throw new Error("Failed to fetch alerts");
    const data = await res.json();
    return data.alerts ?? [];
  }

  async createAlert(userId: number, body: CreateAlertBody): Promise<Alert> {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create alert");
    }
    const data = await res.json();
    return data.alert;
  }

  async deleteAlert(userId: number, alertId: number): Promise<void> {
    const res = await fetch(
      `${API_BASE}/alerts/${alertId}?${this.getUserIdParam(userId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete alert");
  }

  async getNotifications(
    userId: number,
    unreadOnly = false
  ): Promise<Notification[]> {
    const url = `${API_BASE}/notifications?${this.getUserIdParam(userId)}${
      unreadOnly ? "&unreadOnly=true" : ""
    }`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    const data = await res.json();
    return data.notifications ?? [];
  }

  async markNotificationRead(
    userId: number,
    notificationId: number
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/notifications/${notificationId}/read?${this.getUserIdParam(
        userId
      )}`,
      { method: "PATCH" }
    );
    if (!res.ok) throw new Error("Failed to mark as read");
  }
}

export const AlertService = new AlertServiceClass();
