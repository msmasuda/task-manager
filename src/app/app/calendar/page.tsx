import Link from "next/link";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { localDateTime } from "@/lib/availability/date";
import { db } from "@/lib/db/client";

const statusLabels = { PENDING: "確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;
const dayLabel = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short" });
const timeLabel = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

function addDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function mondayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDate(date, -(day === 0 ? 6 : day - 1));
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string; location?: string }> }) {
  const context = await getAppointmentAccessContext();
  const query = await searchParams;
  const selectedDate = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const view = query.view === "week" ? "week" : "day";
  const startDate = view === "week" ? mondayOf(selectedDate) : selectedDate;
  const dates = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) => addDate(startDate, index));
  const locations = await db.location.findMany({ where: { organizationId: context.organization.id, ...(context.locationIds ? { id: { in: context.locationIds } } : {}) }, orderBy: { name: "asc" } });
  const locationId = locations.some(({ id }) => id === query.location) ? query.location : undefined;
  const appointments = await db.appointment.findMany({ where: { organizationId: context.organization.id, locationId: locationId ?? (context.locationIds ? { in: context.locationIds } : undefined), startAt: { gte: localDateTime(startDate, "00:00"), lt: localDateTime(addDate(dates.at(-1)!, 1), "00:00") }, status: { notIn: ["CANCELLED", "REJECTED"] } }, include: { customer: true, location: true, assignments: { include: { user: true } } }, orderBy: { startAt: "asc" } });
  const previous = addDate(selectedDate, view === "week" ? -7 : -1);
  const next = addDate(selectedDate, view === "week" ? 7 : 1);
  const queryFor = (date: string, nextView = view) => `/app/calendar?date=${date}&view=${nextView}${locationId ? `&location=${locationId}` : ""}`;
  return <main className="content calendar-content"><header className="page-heading"><div><p className="eyebrow">スケジュール</p><h1>カレンダー</h1><p className="lead">予約と担当状況を日・週単位で確認します。</p></div><Link className="primary-button" href="/app/appointments/new">予約を登録</Link></header><div className="calendar-toolbar"><div className="calendar-nav"><Link className="secondary-button" href={queryFor(previous)}>←</Link><input form="calendar-filter" name="date" type="date" defaultValue={selectedDate} /><Link className="secondary-button" href={queryFor(next)}>→</Link></div><form id="calendar-filter" className="calendar-filters"><select name="location" defaultValue={locationId ?? ""}><option value="">すべての店舗</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select><input type="hidden" name="view" value={view} /><button className="secondary-button" type="submit">表示</button></form><div className="view-toggle"><Link className={view === "day" ? "active" : ""} href={queryFor(selectedDate, "day")}>日</Link><Link className={view === "week" ? "active" : ""} href={queryFor(selectedDate, "week")}>週</Link></div></div>
    <section className={`calendar-grid ${view}`}>{dates.map((date) => { const items = appointments.filter((appointment) => appointment.startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }) === date); return <div className="calendar-day" key={date}><header><strong>{dayLabel.format(new Date(`${date}T12:00:00+09:00`))}</strong><span>{items.length}件</span></header><div className="calendar-events">{items.length === 0 ? <p className="empty-state">予約なし</p> : items.map((appointment) => <Link className="calendar-event" href={`/app/appointments/${appointment.id}`} key={appointment.id}><time>{timeLabel.format(appointment.startAt)}</time><strong>{appointment.customer.name}</strong><span>{appointment.serviceNameSnapshot}</span><small>{appointment.location.name}・{appointment.assignments.map(({ user }) => user.name).join("、") || "未割当"}</small><em>{statusLabels[appointment.status]}</em></Link>)}</div></div>; })}</section>
  </main>;
}
