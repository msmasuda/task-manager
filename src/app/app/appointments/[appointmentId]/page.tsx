import Link from "next/link";
import { getAllowedAppointmentTransitions } from "@/lib/appointments/status";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { db } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { updateAppointmentStatus } from "../actions";

const labels = { PENDING: "確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;
const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" });

export default async function AppointmentDetailPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams: Promise<{ error?: string; saved?: string; rescheduled?: string }> }) {
  const { appointmentId } = await params;
  const query = await searchParams;
  const context = await getAppointmentAccessContext();
  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, organizationId: context.organization.id, ...(context.locationIds ? { locationId: { in: context.locationIds } } : {}) }, include: { customer: true, location: true, assignments: { include: { user: true } }, resourceReservations: { include: { resource: true } }, statusHistory: { include: { changedBy: true }, orderBy: { changedAt: "desc" } } } });
  if (!appointment) notFound();
  const transitions = getAllowedAppointmentTransitions(appointment.status);
  return <main className="content narrow-content"><Link className="back-link" href="/app/appointments">← 予約一覧</Link><header className="page-heading"><div><p className="eyebrow">予約詳細</p><h1>{appointment.customer.name}</h1><p className="lead">{appointment.serviceNameSnapshot}</p></div><div className="heading-actions">{["PENDING", "CONFIRMED"].includes(appointment.status) && <Link className="secondary-button" href={`/app/appointments/${appointment.id}/edit`}>日時を変更</Link>}<span className={`status ${appointment.status === "PENDING" ? "pending" : "confirmed"}`}>{labels[appointment.status]}</span></div></header>{query.error && <p className="form-error">{query.error}</p>}{query.saved && <p className="form-success">更新しました。</p>}
    <div className="detail-grid"><section className="panel settings-panel"><h2 className="panel-title">予約内容</h2><dl className="appointment-details"><div><dt>日時</dt><dd>{dateTime.format(appointment.startAt)}〜</dd></div><div><dt>店舗</dt><dd>{appointment.location.name}</dd></div><div><dt>担当</dt><dd>{appointment.assignments.map(({ user }) => user.name).join("、") || "未割当"}</dd></div><div><dt>設備</dt><dd>{appointment.resourceReservations.map(({ resource }) => resource.name).join("、") || "なし"}</dd></div><div><dt>連絡先</dt><dd>{appointment.customer.email ?? "—"}<br />{appointment.customer.phone ?? ""}</dd></div></dl>{appointment.customerNote && <><h3 className="subheading">お客様メモ</h3><p>{appointment.customerNote}</p></>}</section>
      <div className="staff-main">{transitions.length > 0 && <section className="panel settings-panel"><h2 className="panel-title">ステータス変更</h2><form action={updateAppointmentStatus} className="settings-form"><input type="hidden" name="appointmentId" value={appointment.id} /><label className="settings-field"><span>変更後</span><select name="status">{transitions.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label><label className="settings-field"><span>理由・メモ</span><input name="reason" maxLength={200} /></label><button className="primary-button" type="submit">更新</button></form></section>}<section className="panel settings-panel"><h2 className="panel-title">変更履歴</h2>{appointment.statusHistory.map((history) => <div className="history-row" key={history.id}><strong>{labels[history.toStatus]}</strong><small>{dateTime.format(history.changedAt)}・{history.changedBy?.name ?? "システム"}</small></div>)}</section></div>
    </div></main>;
}
