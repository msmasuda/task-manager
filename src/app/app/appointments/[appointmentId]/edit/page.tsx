import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import { rescheduleAppointment } from "./actions";

const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

export default async function EditAppointmentPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams: Promise<{ date?: string; start?: string; error?: string }> }) {
  const { appointmentId } = await params;
  const query = await searchParams;
  const context = await getAppointmentAccessContext();
  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, organizationId: context.organization.id, ...(context.locationIds ? { locationId: { in: context.locationIds } } : {}) }, include: { customer: true, location: true } });
  if (!appointment) notFound();
  const currentDate = appointment.startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : currentDate;
  const availability = await findInternalAvailability({ organizationId: context.organization.id, locationId: appointment.locationId, serviceId: appointment.serviceId, date, excludeAppointmentId: appointment.id });
  const selectedSlot = query.start ? availability?.slots.find((slot) => slot.start.toISOString() === query.start) : undefined;
  return <main className="content narrow-content"><Link className="back-link" href={`/app/appointments/${appointment.id}`}>← 予約詳細</Link><header className="page-heading"><div><p className="eyebrow">日時変更</p><h1>{appointment.customer.name}</h1><p className="lead">{appointment.serviceNameSnapshot}・{appointment.location.name}</p></div></header>{query.error && <p className="form-error">{query.error}</p>}{!["PENDING", "CONFIRMED"].includes(appointment.status) ? <p className="form-error">この状態の予約は日時変更できません。</p> : <section className="panel settings-panel"><form className="date-form"><input name="date" type="date" defaultValue={date} /><button className="secondary-button" type="submit">空き枠を表示</button></form><div className="slot-grid">{availability?.slots.map((slot) => <Link className={`slot-button${selectedSlot?.start.getTime() === slot.start.getTime() ? " selected" : ""}`} href={`/app/appointments/${appointment.id}/edit?date=${date}&start=${encodeURIComponent(slot.start.toISOString())}`} key={slot.start.toISOString()}>{time.format(slot.start)}</Link>)}</div>{availability?.slots.length === 0 && <p className="empty-state">選択日に変更可能な時間はありません。</p>}{selectedSlot && <form action={rescheduleAppointment} className="reschedule-confirm"><input type="hidden" name="appointmentId" value={appointment.id} /><input type="hidden" name="startAt" value={selectedSlot.start.toISOString()} /><p><strong>{date} {time.format(selectedSlot.start)}</strong>へ変更します。</p><button className="primary-button" type="submit">日時変更を確定</button></form>}</section>}</main>;
}
