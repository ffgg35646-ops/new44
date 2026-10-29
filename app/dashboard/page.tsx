import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/components/logout-button";
import { QualitySettings } from "@/app/components/quality-settings";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/login");
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark brand-mark-small" aria-hidden="true"><span className="brand-mark-core">A</span></div>
          <div><strong>ARK CONTROL</strong><span>ADMIN CONSOLE</span></div>
        </div>
        <div className="sidebar-section-label">مساحة الإدارة</div>
        <div className="sidebar-link active" aria-current="page">
          <span className="nav-square" aria-hidden="true">⌂</span><span>الرئيسية</span>
          <span className="active-indicator" aria-hidden="true" />
        </div>
        <a className="sidebar-link" href="#quality-settings">
          <span className="nav-square" aria-hidden="true">◒</span><span>جودة الرسومات</span>
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-led" aria-hidden="true" />
            <div><strong>جلسة الأدمن نشطة</strong><span>تم التحقق من الدخول</span></div>
          </div>
          <LogoutButton />
          <p className="sidebar-version">نسخة تأسيسية · 0.2</p>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div><p className="eyebrow">ADMIN WORKSPACE</p><h1>لوحة التحكم</h1></div>
          <div className="admin-chip">
            <span className="admin-avatar" aria-hidden="true">A</span>
            <span><strong>Administrator</strong><small>مسؤول النظام</small></span>
            <span className="status-led" aria-label="الجلسة نشطة" />
          </div>
        </header>

        <section className="welcome-panel">
          <div className="welcome-copy">
            <span className="stage-tag"><span /> المرحلة الأولى</span>
            <h2>إعدادات اللعبة من مكان واحد</h2>
            <p>اضبط مستوى جودة الرسومات من شريط واحد، واختر مستوى منخفض أو متوسط أو مرتفع. واجهة التحكم جاهزة؛ تطبيق القيمة داخل اللعبة يحتاج ربطًا منفصلًا بعميل اللعبة.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="art-ring art-ring-one" /><span className="art-ring art-ring-two" /><span className="art-core">A</span>
          </div>
        </section>

        <div className="section-heading">
          <div><p className="eyebrow">GRAPHICS SETTINGS</p><h2>التحكم في الجودة</h2></div>
          <span className="plain-status">إعداد أولي</span>
        </div>

        <QualitySettings />

        <section className="next-tools-panel">
          <div className="next-tools-icon" aria-hidden="true">＋</div>
          <div>
            <h3>الأداة التالية</h3>
            <p>لوحة الإدارة جاهزة لإضافة وظائف أخرى بعد تحديدها، مثل إعدادات الكاميرا أو إدارة قائمة السيرفرات.</p>
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>ARK CONTROL CONSOLE</span><span>لوحة داخلية · دخول مصرح فقط</span>
        </footer>
      </section>
    </main>
  );
}
