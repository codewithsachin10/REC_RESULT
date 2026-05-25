import { TopNav } from "@/components/dashboard/top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (authData?.user) {
    // Check if 2FA is required
    const { data: telegramData } = await supabase
      .from("telegram_users")
      .select("two_factor_enabled")
      .eq("student_id", authData.user.id)
      .single();

    if (telegramData?.two_factor_enabled) {
      const cookieStore = await cookies();
      const verified = cookieStore.get("telegram_2fa_verified")?.value;
      if (!verified) {
        // Sign out to force re-authentication for OTP
        await supabase.auth.signOut();
        redirect("/login");
      }
    }
  } else {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <div className="flex-1 flex flex-col">
        <TopNav />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
