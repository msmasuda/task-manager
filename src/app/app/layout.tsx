import { LogOut, MapPin } from "lucide-react";
import { signOut } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { db } from "@/lib/db/client";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { membership } = await getCurrentContext();
  const locations = await db.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(membership.role === "STAFF" ? { members: { some: { userId: membership.userId } } } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="app-shell">
      <AppSidebar canManage={membership.role !== "STAFF"} />
      <div className="main">
        <header className="topbar">
          <div className="location-switcher"><MapPin size={16} color="var(--primary)" aria-hidden="true" />{locations[0]?.name ?? "店舗未登録"}</div>
          <div className="account-menu">
            <div className="user-avatar" aria-label={`${membership.user.name}さんのアカウント`}>{membership.user.name.slice(0, 2).toUpperCase()}</div>
            <span>{membership.user.name}</span>
            <form action={logout}><button className="icon-button" type="submit" aria-label="ログアウト"><LogOut size={17} /></button></form>
          </div>
        </header>
        {children}
      </div>
      <MobileNavigation />
    </div>
  );
}
