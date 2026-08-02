import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import { assignAppointmentStaff } from "./actions";

const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" });

export default async function AssignAppointmentPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { appointmentId } = await params;
  const { error } = await searchParams;
  const context = await getAppointmentAccessContext();
  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, organizationId: context.organization.id, ...(context.locationIds ? { locationId: { in: context.locationIds } } : {}) }, include: { customer: true, location: true, assignments: true, service: true } });
  if (!appointment) notFound();
  const date = appointment.startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = await findInternalAvailability({ organizationId: context.organization.id, locationId: appointment.locationId, serviceId: appointment.serviceId, date, excludeAppointmentId: appointment.id });
  const slot = availability?.slots.find((item) => item.start.getTime() === appointment.startAt.getTime());
  const candidates = slot ? await db.user.findMany({ where: { id: { in: slot.availableStaffIds } }, orderBy: { name: "asc" } }) : [];
  const currentPrimary = appointment.assignments.find(({ type }) => type === "PRIMARY")?.userId;
  return <main className="content narrow-content"><Link className="back-link" href={`/app/appointments/${appointment.id}`}>← 予約詳細</Link><header className="page-heading"><div><p className="eyebrow">担当変更</p><h1>{appointment.customer.name}</h1><p className="lead">{appointment.serviceNameSnapshot}・{dateTime.format(appointment.startAt)}</p></div></header>{error && <p className="form-error">{error}</p>}<section className="panel settings-panel"><h2 className="panel-title">主担当を選択</h2><p className="section-help">勤務・休暇・対応サービス・予約重複を確認した候補です。必要人数が複数の場合、他の担当者は空き候補から自動選択します。</p>{candidates.length === 0 ? <p className="form-error">現在割り当て可能なスタッフはいません。</p> : <form action={assignAppointmentStaff} className="settings-form"><input type="hidden" name="appointmentId" value={appointment.id} /><div className="candidate-list">{candidates.map((user) => <label className="candidate-card" key={user.id}><input name="primaryUserId" type="radio" value={user.id} defaultChecked={user.id === currentPrimary || (!currentPrimary && user.id === candidates[0].id)} /><span><strong>{user.name}</strong><small>{user.email}</small></span></label>)}</div><button className="primary-button" type="submit">担当者を変更</button></form>}</section></main>;
}
