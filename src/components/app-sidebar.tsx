import {
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  Clock4,
  CalendarCheck,
  CalendarPlus,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Warehouse,
  ScrollText,
  MailCheck,
  UserCog,
  CalendarRange,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const primaryNavigation = [
  { label: "今日の概要", href: "/app", icon: LayoutDashboard },
  { label: "カレンダー", href: "/app/calendar", icon: CalendarDays },
  { label: "予約一覧", href: "/app/appointments", icon: CalendarCheck },
  { label: "予約を登録", href: "/app/appointments/new", icon: CalendarPlus },
  { label: "担当割当", href: "/app/assignments", icon: UsersRound },
  { label: "対応ボード", href: "/app/board", icon: KanbanSquare },
  { label: "顧客", href: "/app/customers", icon: Users },
];

export function AppSidebar({ canManage = false }: { canManage?: boolean }) {
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
        {canManage && <Link className="nav-link" href="/app/settings/staff">
          <UserCog size={17} aria-hidden="true" />
          スタッフ管理
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/staff-availability">
          <CalendarRange size={17} aria-hidden="true" />
          スタッフ勤務・休暇
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/locations">
          <Building2 size={17} aria-hidden="true" />
          店舗設定
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/services">
          <BriefcaseBusiness size={17} aria-hidden="true" />
          サービス管理
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/schedules">
          <Clock4 size={17} aria-hidden="true" />
          営業時間・休業日
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/resources">
          <Warehouse size={17} aria-hidden="true" />
          設備・部屋
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/organization">
          <Settings size={17} aria-hidden="true" />
          企業設定
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/audit-logs">
          <ScrollText size={17} aria-hidden="true" />
          操作履歴
        </Link>}
        {canManage && <Link className="nav-link" href="/app/settings/email-deliveries">
          <MailCheck size={17} aria-hidden="true" />
          メール送信履歴
        </Link>}
      </nav>
    </aside>
  );
}
