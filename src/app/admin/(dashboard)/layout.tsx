import AdminShell from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ count: newInquiries }, { count: newRequests }, { data: userData }] = await Promise.all([
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("commission_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.auth.getUser(),
  ]);

  return (
    <AdminShell newInquiries={newInquiries ?? 0} newRequests={newRequests ?? 0} userEmail={userData.user?.email}>
      {children}
    </AdminShell>
  );
}
