import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken,
  isAdminConfigurationReady, verifyAdminCredentials
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status, headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  if (!isAdminConfigurationReady()) {
    return jsonError("تسجيل دخول الأدمن غير مهيأ بعد. يلزم ضبط متغيرات الدخول السرية في بيئة التشغيل.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("البيانات المرسلة غير صالحة.", 400);
  }
  if (!body || typeof body !== "object") return jsonError("البيانات المرسلة غير صالحة.", 400);
  const data = body as Record<string, unknown>;
  const username = data.username;
  const password = data.password;
  if (typeof username !== "string" || typeof password !== "string" ||
      username.length < 1 || username.length > 128 ||
      password.length < 1 || password.length > 512) {
    return jsonError("أدخل اسم المستخدم وكلمة المرور.", 400);
  }
  if (verifyAdminCredentials(username, password) !== "valid") {
    return jsonError("اسم المستخدم أو كلمة المرور غير صحيحة.", 401);
  }

  const token = createAdminSessionToken();
  if (!token) return jsonError("تعذّر إنشاء جلسة آمنة. راجع إعدادات الخادم.", 503);
  const response = NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" }
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: ADMIN_SESSION_TTL_SECONDS
  });
  return response;
}
