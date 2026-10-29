import { redirect } from "next/navigation";
import { LoginForm } from "@/app/components/login-form";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) redirect("/dashboard");
  return (
    <main className="login-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true"><span className="brand-mark-core">A</span></div>
        <p className="eyebrow">ARK CONTROL CONSOLE</p>
        <h1 id="login-title">تسجيل دخول الأدمن</h1>
        <p className="login-subtitle">بوابة الإدارة الخاصة. سجّل الدخول للمتابعة إلى لوحة التحكم.</p>
        <LoginForm />
        <div className="login-security-note"><span className="security-dot" aria-hidden="true" /><span>دخول مخصص للمسؤول المصرّح له</span></div>
      </section>
      <p className="page-footnote">ARK CONTROL <span>•</span> ADMIN ACCESS</p>
    </main>
  );
}
