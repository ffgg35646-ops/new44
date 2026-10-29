import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  redirect((await isAdminAuthenticated()) ? "/dashboard" : "/login");
}
