import Link from "next/link";
import { notFound } from "next/navigation";
import { findPublicAvailability } from "@/lib/availability/query";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { changePublicAppointment } from "./actions";

const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

export default async function ChangeAppointmentPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ date?: string; start?: string; error?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  const appointment = await db.appointment.findUnique({ where: { managementTokenHash: hashToken(token) }, include: { location: { include: { organization: true } }, customer: true } });
  if (!appointment) notFound();
  const currentDate = appointment.startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : currentDate;
  const deadline = new Date(appointment.startAt.getTime() - (appointment.location.cancellationDeadlineMinutes ?? 0) * 60_000);
  const canChange = ["PENDING", "CONFIRMED"].includes(appointment.status) && new Date() < deadline;
  const availability = canChange ? await findPublicAvailability({ organizationSlug: appointment.location.organization.slug, locationSlug: appointment.location.slug, serviceId: appointment.serviceId, date, excludeAppointmentId: appointment.id }) : null;
  const selectedSlot = query.start ? availability?.slots.find((slot) => slot.start.toISOString() === query.start) : undefined;
  return <main className="booking-shell"><section className="booking-container narrow-booking"><Link className="back-link" href={`/appointment/${token}`}>← 予約内容へ</Link><p className="eyebrow">日時変更</p><h1>{appointment.serviceNameSnapshot}</h1>{query.error && <p className="form-error">{query.error}</p>}{!canChange ? <p className="form-error">この予約は日時変更できないか、変更受付期限を過ぎています。</p> : <><form className="date-form"><input name="date" type="date" defaultValue={date} /><button className="secondary-button" type="submit">空き枠を表示</button></form><div className="slot-grid">{availability?.slots.map((slot) => <Link className={`slot-button${selectedSlot?.start.getTime() === slot.start.getTime() ? " selected" : ""}`} href={`/appointment/${token}/change?date=${date}&start=${encodeURIComponent(slot.start.toISOString())}`} key={slot.start.toISOString()}>{time.format(slot.start)}</Link>)}</div>{availability?.slots.length === 0 && <p className="empty-state">選択日に変更可能な時間はありません。</p>}{selectedSlot && <form action={changePublicAppointment} className="reschedule-confirm"><input type="hidden" name="token" value={token} /><input type="hidden" name="startAt" value={selectedSlot.start.toISOString()} /><p><strong>{date} {time.format(selectedSlot.start)}</strong>へ変更します。</p><button className="primary-button" type="submit">変更を確定</button></form>}</>}</section></main>;
}
