import Link from "next/link";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { db } from "@/lib/db/client";

const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });

export default async function AssignmentsPage() {
  const context = await getAppointmentAccessContext();
  const appointments = await db.appointment.findMany({ where: { organizationId: context.organization.id, ...(context.locationIds ? { locationId: { in: context.locationIds } } : {}), status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, startAt: { gte: new Date() } }, include: { customer: true, location: true, assignments: { include: { user: true } } }, orderBy: { startAt: "asc" }, take: 200 });
  const ordered = appointments.sort((a, b) => Number(a.assignments.length > 0) - Number(b.assignments.length > 0) || a.startAt.getTime() - b.startAt.getTime());
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">アサイン</p><h1>担当割当</h1><p className="lead">未割当を優先して、今後の予約担当者を確認・変更します。</p></div></header><section className="panel appointment-table-wrap">{ordered.length === 0 ? <p className="empty-state">対象の予約はありません。</p> : <table className="data-table"><thead><tr><th>日時</th><th>顧客・サービス</th><th>店舗</th><th>現在の担当</th><th></th></tr></thead><tbody>{ordered.map((appointment) => <tr key={appointment.id}><td>{dateTime.format(appointment.startAt)}</td><td>{appointment.customer.name}<small>{appointment.serviceNameSnapshot}</small></td><td>{appointment.location.name}</td><td>{appointment.assignments.map(({ user }) => user.name).join("、") || <span className="status pending">未割当</span>}</td><td><Link className="secondary-button" href={`/app/appointments/${appointment.id}/assign`}>担当を変更</Link></td></tr>)}</tbody></table>}</section></main>;
}
