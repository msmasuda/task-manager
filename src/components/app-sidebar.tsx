import {
  Building2,
  CalendarDays,
  CalendarCheck,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

const primaryNavigation = [
  { label: "今日の概要", href: "/app", icon: LayoutDashboard },
  { label: "カレンダー", href: "/app/calendar", icon: CalendarDays },
  { label: "予約一覧", href: "/app/appointments", icon: CalendarCheck },
  { label: "対応ボード", href: "/app/board", icon: KanbanSquare },
  { label: "顧客", href: "/app/customers", icon: Users },
];

export function AppSidebar() {
  return (
    <aside className="sidebar">
      <Link className="sidebar-brand" href="/app">
        <span className="brand-mark">
          <CalendarCheck size={18} aria-hidden="true" />
        </span>
        Reservation
      </Link>
      <p className="nav-label">Workspace</p>
      <nav aria-label="管理画面ナビゲーション">
        {primaryNavigation.map(({ label, href, icon: Icon }, index) => (
          <Link
            className={`nav-link${index === 0 ? " active" : ""}`}
            href={href}
            key={href}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <p className="nav-label">Management</p>
      <nav aria-label="設定ナビゲーション">
        <Link className="nav-link" href="/app/settings/locations">
          <Building2 size={17} aria-hidden="true" />
          店舗設定
        </Link>
        <Link className="nav-link" href="/app/settings">
          <Settings size={17} aria-hidden="true" />
          各種設定
        </Link>
      </nav>
    </aside>
  );
}
