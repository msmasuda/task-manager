import { ChevronDown, MapPin } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="main">
        <header className="topbar">
          <button
            className="location-switcher"
            type="button"
            aria-label="店舗を切り替える"
          >
            <MapPin size={16} color="var(--primary)" aria-hidden="true" />
            青山店
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <div className="user-avatar" aria-label="山田さんのアカウント">
            YD
          </div>
        </header>
        {children}
      </div>
      <MobileNavigation />
    </div>
  );
}
