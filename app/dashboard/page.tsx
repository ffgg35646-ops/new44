import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/components/logout-button";
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
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-led" aria-hidden="true" />
            <div><strong>جلسة الأدمن نشطة</strong><span>تم التحقق من الدخول</span></div>
          </div>
          <LogoutButton />
          <p className="sidebar-version">نسخة تأسيسية · 0.1</p>
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
            <h2>أهلًا بيك في لوحة الإدارة</h2>
            <p>الهيكل الأساسي جاهز. هنضيف الأقسام والأدوات المطلوبة بعد ما تحدد الوظائف اللي عايزها، من غير ما نفترض أي أدوات من عندنا.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="art-ring art-ring-one" /><span className="art-ring art-ring-two" /><span className="art-core">A</span>
          </div>
        </section>

        <div className="section-heading">
          <div><p className="eyebrow">WORKSPACE STATUS</p><h2>مساحة العمل</h2></div>
          <span className="plain-status">بانتظار تحديد الوظائف</span>
        </div>
        <section className="empty-state" aria-labelledby="empty-title">
          <div className="empty-icon" aria-hidden="true"><span>＋</span></div>
          <h3 id="empty-title">جاهزين نضيف أول أداة</h3>
          <p>مفيش حاليًا تحكم في سيرفرات أو إعدادات لعبة مربوط باللوحة. دي نسخة تأسيسية لتسجيل الدخول وتأمين مساحة الأدمن فقط.</p>
          <div className="empty-state-foot"><span className="empty-state-line" /><span>بانتظار متطلباتك</span><span className="empty-state-line" /></div>
        </section>
        <footer className="dashboard-footer">
          <span>ARK CONTROL CONSOLE</span><span>لوحة داخلية · دخول مصرح فقط</span>
        </footer>
      </section>
    </main>
  );
}
