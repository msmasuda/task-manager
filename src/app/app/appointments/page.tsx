import Link from "next/link";
import type { AppointmentStatus } from "../../../../generated/prisma/client";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { localDateTime } from "@/lib/availability/date";
import { db } from "@/lib/db/client";

const statuses: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"];
const labels = { PENDING: "確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;
const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string; status?: string; location?: string }> }) {
  const context = await getAppointmentAccessContext();
  const query = await searchParams;
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const status = statuses.includes(query.status as AppointmentStatus) ? query.status as AppointmentStatus : undefined;
  const locations = await db.location.findMany({ where: { organizationId: context.organization.id, ...(context.locationIds ? { id: { in: context.locationIds } } : {}) }, orderBy: { name: "asc" } });
  const locationId = locations.some(({ id }) => id === query.location) ? query.location : undefined;
  const appointments = await db.appointment.findMany({
    where: { organizationId: context.organization.id, locationId: locationId ?? (context.locationIds ? { in: context.locationIds } : undefined), status, startAt: { gte: localDateTime(date, "00:00"), lt: localDateTime(date, "00:00", true) } },
    include: { customer: true, location: true, assignments: { include: { user: true } } }, orderBy: { startAt: "asc" }, take: 200,
  });
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">予約</p><h1>予約一覧</h1><p className="lead">日付・店舗・ステータスで予約を確認します。</p></div></header><form className="filter-bar"><label>日付<input name="date" type="date" defaultValue={date} /></label><label>店舗<select name="location" defaultValue={locationId ?? ""}><option value="">すべて</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label><label>ステータス<select name="status" defaultValue={status ?? ""}><option value="">すべて</option>{statuses.map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select></label><button className="secondary-button" type="submit">絞り込む</button></form>
    <section className="panel appointment-table-wrap">{appointments.length === 0 ? <p className="empty-state">該当する予約はありません。</p> : <table className="data-table"><thead><tr><th>日時</th><th>顧客</th><th>サービス</th><th>店舗・担当</th><th>状態</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.id}><td><Link href={`/app/appointments/${appointment.id}`}>{dateTime.format(appointment.startAt)}</Link></td><td>{appointment.customer.name}</td><td>{appointment.serviceNameSnapshot}</td><td>{appointment.location.name}<small>{appointment.assignments.map(({ user }) => user.name).join("、") || "未割当"}</small></td><td><span className={`status ${appointment.status === "PENDING" ? "pending" : "confirmed"}`}>{labels[appointment.status]}</span></td></tr>)}</tbody></table>}</section>
  </main>;
}
