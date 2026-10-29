'use client';

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = { error?: string };

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store"
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok) {
        setError(result.error ?? "تعذّر تسجيل الدخول. راجع البيانات وحاول مرة أخرى.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="username">اسم المستخدم</label>
        <input id="username" name="username" type="text" autoComplete="username"
          autoCapitalize="none" spellCheck={false} maxLength={128}
          value={username} onChange={(event) => setUsername(event.target.value)}
          placeholder="اكتب اسم المستخدم" required disabled={loading} />
      </div>
      <div className="field-group">
        <label htmlFor="password">كلمة المرور</label>
        <div className="password-input-wrap">
          <input id="password" name="password" type={showPassword ? "text" : "password"}
            autoComplete="current-password" maxLength={512} value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="اكتب كلمة المرور" required disabled={loading} />
          <button className="password-toggle" type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            disabled={loading}>{showPassword ? "إخفاء" : "إظهار"}</button>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button login-submit" type="submit" disabled={loading}>
        {loading ? <><span className="loading-spinner" aria-hidden="true" />جارٍ التحقق...</> :
          <>دخول لوحة التحكم <span aria-hidden="true" className="button-arrow">←</span></>}
      </button>
    </form>
  );
}
