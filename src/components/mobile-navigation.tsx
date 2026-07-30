import { CalendarDays, KanbanSquare, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";

const links = [
  { label: "ホーム", href: "/app", icon: LayoutDashboard },
  { label: "予定", href: "/app/calendar", icon: CalendarDays },
  { label: "ボード", href: "/app/board", icon: KanbanSquare },
  { label: "顧客", href: "/app/customers", icon: Users },
];

export function MobileNavigation() {
  return (
    <nav className="mobile-nav" aria-label="モバイルナビゲーション">
      {links.map(({ label, href, icon: Icon }) => (
        <Link href={href} key={href}>
          <Icon size={19} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
