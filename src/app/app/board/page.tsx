import Link from "next/link";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { getAllowedAppointmentTransitions } from "@/lib/appointments/status";
import { localDateTime } from "@/lib/availability/date";
import { db } from "@/lib/db/client";
import { updateAppointmentStatus } from "../appointments/actions";

const columns = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"] as const;
const labels = { PENDING: "確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;
const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ date?: string; location?: string }> }) {
  const context = await getAppointmentAccessContext();
  const query = await searchParams;
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const locations = await db.location.findMany({ where: { organizationId: context.organization.id, ...(context.locationIds ? { id: { in: context.locationIds } } : {}) }, orderBy: { name: "asc" } });
  const locationId = locations.some(({ id }) => id === query.location) ? query.location : undefined;
  const appointments = await db.appointment.findMany({ where: { organizationId: context.organization.id, locationId: locationId ?? (context.locationIds ? { in: context.locationIds } : undefined), startAt: { gte: localDateTime(date, "00:00"), lt: localDateTime(date, "00:00", true) }, status: { in: [...columns] } }, include: { customer: true, location: true, assignments: { include: { user: true } } }, orderBy: { startAt: "asc" } });
  return <main className="content board-content"><header className="page-heading"><div><p className="eyebrow">進行管理</p><h1>対応状況ボード</h1><p className="lead">予約確認から対応完了までの進捗を管理します。</p></div></header><form className="filter-bar"><label>日付<input name="date" type="date" defaultValue={date} /></label><label>店舗<select name="location" defaultValue={locationId ?? ""}><option value="">すべて</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label><button className="secondary-button" type="submit">表示</button></form><section className="board-grid">{columns.map((status) => { const items = appointments.filter((appointment) => appointment.status === status); return <div className="board-column" key={status}><header><strong>{labels[status]}</strong><span>{items.length}</span></header><div className="board-cards">{items.map((appointment) => { const next = getAllowedAppointmentTransitions(appointment.status).filter((value) => columns.includes(value as typeof columns[number])); return <article className="board-card" key={appointment.id}><Link href={`/app/appointments/${appointment.id}`}><time>{time.format(appointment.startAt)}・{appointment.location.name}</time><strong>{appointment.customer.name}</strong><span>{appointment.serviceNameSnapshot}</span><small>{appointment.assignments.map(({ user }) => user.name).join("、") || "未割当"}</small></Link>{next.length > 0 && <form action={updateAppointmentStatus}><input type="hidden" name="appointmentId" value={appointment.id} /><input type="hidden" name="status" value={next[0]} /><button className="board-action" type="submit">{labels[next[0]]}へ →</button></form>}</article>; })}{items.length === 0 && <p className="empty-state">予約なし</p>}</div></div>; })}</section></main>;
}
