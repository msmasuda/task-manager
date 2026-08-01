import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { db } from "@/lib/db/client";
import { updateCustomerNote } from "../actions";

const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });
const labels = { PENDING: "確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;

export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ customerId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { customerId } = await params;
  const query = await searchParams;
  const context = await getAppointmentAccessContext();
  const customer = await db.customer.findFirst({ where: { id: customerId, organizationId: context.organization.id, ...(context.locationIds ? { appointments: { some: { locationId: { in: context.locationIds } } } } : {}) }, include: { appointments: { where: context.locationIds ? { locationId: { in: context.locationIds } } : {}, include: { location: true }, orderBy: { startAt: "desc" }, take: 100 } } });
  if (!customer) notFound();
  return <main className="content narrow-content"><Link className="back-link" href="/app/customers">← 顧客台帳</Link><header className="page-heading"><div><p className="eyebrow">顧客詳細</p><h1>{customer.name}</h1><p className="lead">{customer.email ?? "メール未登録"}・{customer.phone ?? "電話未登録"}</p></div></header>{query.error && <p className="form-error">{query.error}</p>}{query.saved && <p className="form-success">メモを保存しました。</p>}<div className="detail-grid"><section className="panel settings-panel"><h2 className="panel-title">予約履歴</h2>{customer.appointments.length === 0 ? <p className="empty-state">予約履歴はありません。</p> : customer.appointments.map((appointment) => <Link className="customer-appointment" href={`/app/appointments/${appointment.id}`} key={appointment.id}><div><strong>{appointment.serviceNameSnapshot}</strong><small>{dateTime.format(appointment.startAt)}・{appointment.location.name}</small></div><span className={`status ${appointment.status === "PENDING" ? "pending" : "confirmed"}`}>{labels[appointment.status]}</span></Link>)}</section><section className="panel settings-panel"><h2 className="panel-title">業務メモ</h2><form action={updateCustomerNote} className="settings-form"><input type="hidden" name="customerId" value={customer.id} /><label className="settings-field"><span>スタッフだけに表示されます</span><textarea name="note" rows={8} maxLength={2000} defaultValue={customer.note ?? ""} /></label><button className="primary-button" type="submit">メモを保存</button></form></section></div></main>;
}
