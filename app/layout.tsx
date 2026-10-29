import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ARK Control | لوحة الإدارة", template: "%s | ARK Control" },
  description: "بوابة الإدارة الخاصة بمشروع ARK Control."
};
export const viewport: Viewport = { themeColor: "#111611", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
