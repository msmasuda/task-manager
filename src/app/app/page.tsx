import { AlertTriangle, CalendarClock, CalendarPlus, CheckCircle2, Clock3, UserRoundCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { localDateTime } from "@/lib/availability/date";
import { db } from "@/lib/db/client";

const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
const fullDate = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "full" });
const labels = { PENDING: "確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;

export default async function DashboardPage() {
  const context = await getAppointmentAccessContext();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const dayStart = localDateTime(today, "00:00");
  const dayEnd = localDateTime(today, "00:00", true);
  const locationWhere = context.locationIds ? { in: context.locationIds } : undefined;
  const [appointments, staffSchedules] = await Promise.all([
    db.appointment.findMany({ where: { organizationId: context.organization.id, locationId: locationWhere, startAt: { gte: dayStart, lt: dayEnd }, status: { notIn: ["CANCELLED", "REJECTED"] } }, include: { customer: true, service: true, assignments: { include: { user: true } }, location: true }, orderBy: { startAt: "asc" } }),
    db.staffSchedule.findMany({ where: { dayOfWeek: new Date(`${today}T00:00:00Z`).getUTCDay(), location: { organizationId: context.organization.id, ...(context.locationIds ? { id: { in: context.locationIds } } : {}) } }, select: { userId: true } }),
  ]);
  const now = new Date();
  const upcoming = appointments.filter((appointment) => appointment.endAt >= now).slice(0, 6);
  const pending = appointments.filter((appointment) => appointment.status === "PENDING");
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED");
  const unassigned = appointments.filter((appointment) => appointment.assignments.length < appointment.service.requiredStaffCount);
  const staffCount = new Set(staffSchedules.map(({ userId }) => userId)).size;
  const stats = [
    { label: "本日の予約", value: appointments.length, note: `${pending.length}件が確認待ち`, icon: CalendarClock },
    { label: "このあとの予約", value: upcoming.length, note: upcoming[0] ? `次は ${time.format(upcoming[0].startAt)}` : "本日は終了", icon: Clock3 },
    { label: "本日の担当者", value: staffCount, note: "勤務設定から集計", icon: UsersRound },
    { label: "完了", value: completed.length, note: appointments.length ? `進捗 ${Math.round(completed.length / appointments.length * 100)}%` : "予約なし", icon: CheckCircle2 },
  ];
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">{fullDate.format(now)}</p><h1>おはようございます、{context.membership.user.name}さん</h1><p className="lead">今日の予約と対応状況を確認しましょう。</p></div><Link className="primary-button" href="/app/appointments/new"><CalendarPlus size={17} />予約を登録</Link></header><section className="stats-grid" aria-label="本日の集計">{stats.map(({ label, value, note, icon: Icon }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><div className="stat-value">{value}</div><p className="stat-note">{note}</p></article>)}</section><div className="dashboard-grid"><section className="panel"><header className="panel-header"><h2 className="panel-title">このあとの予約</h2><Link className="secondary-button" href={`/app/appointments?date=${today}`}>すべて表示</Link></header><div className="appointment-list">{upcoming.length === 0 ? <p className="empty-state">このあとの予約はありません。</p> : upcoming.map((appointment) => <Link className="appointment-row" href={`/app/appointments/${appointment.id}`} key={appointment.id}><div className="time">{time.format(appointment.startAt)}<small>{appointment.durationMinutesSnapshot}分</small></div><div><p className="appointment-name">{appointment.customer.name}</p><p className="appointment-meta">{appointment.serviceNameSnapshot}・担当 {appointment.assignments.map(({ user }) => user.name).join("、") || "未割当"}</p></div><span className={`status ${appointment.status === "PENDING" ? "pending" : appointment.status === "IN_PROGRESS" ? "progress" : "confirmed"}`}>{labels[appointment.status]}</span></Link>)}</div></section><aside className="panel"><header className="panel-header"><h2 className="panel-title">確認が必要です</h2><span className="status pending">{pending.length + unassigned.length}件</span></header><div className="attention-list">{unassigned.length > 0 && <Link className="attention-item" href="/app/assignments"><span className="attention-icon"><UserRoundCheck size={17} /></span><div><p className="attention-title">担当者が未割当</p><p className="attention-detail">{unassigned.length}件の予約を確認してください</p></div></Link>}{pending.length > 0 && <Link className="attention-item" href={`/app/appointments?date=${today}&status=PENDING`}><span className="attention-icon"><AlertTriangle size={17} /></span><div><p className="attention-title">予約の承認待ち</p><p className="attention-detail">{pending.length}件の予約があります</p></div></Link>}{pending.length === 0 && unassigned.length === 0 && <p className="empty-state">確認が必要な予約はありません。</p>}</div></aside></div></main>;
}
