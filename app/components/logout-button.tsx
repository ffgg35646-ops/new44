'use client';

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.assign("/login");
    }
  }
  return (
    <button type="button" className="logout-button" onClick={handleLogout} disabled={loading}>
      <span className="logout-symbol" aria-hidden="true">↪</span>
      {loading ? "جارٍ الخروج..." : "تسجيل الخروج"}
    </button>
  );
}
