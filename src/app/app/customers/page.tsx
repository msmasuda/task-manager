import Link from "next/link";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { db } from "@/lib/db/client";

const date = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium" });

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const context = await getAppointmentAccessContext();
  const { q: rawQuery } = await searchParams;
  const q = rawQuery?.trim().slice(0, 100) ?? "";
  const customers = await db.customer.findMany({
    where: {
      organizationId: context.organization.id,
      ...(context.locationIds ? { appointments: { some: { locationId: { in: context.locationIds } } } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { nameKana: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    },
    include: { appointments: { where: context.locationIds ? { locationId: { in: context.locationIds } } : {}, orderBy: { startAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" }, take: 200,
  });
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">顧客</p><h1>顧客台帳</h1><p className="lead">連絡先と予約履歴を確認します。</p></div></header><form className="filter-bar customer-search"><label>氏名・メール・電話番号<input name="q" defaultValue={q} placeholder="顧客を検索" /></label><button className="secondary-button" type="submit">検索</button></form><section className="panel appointment-table-wrap">{customers.length === 0 ? <p className="empty-state">該当する顧客はいません。</p> : <table className="data-table"><thead><tr><th>氏名</th><th>連絡先</th><th>最終予約</th><th>予約件数</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><Link href={`/app/customers/${customer.id}`}>{customer.name}</Link></td><td>{customer.email ?? "—"}<small>{customer.phone}</small></td><td>{customer.appointments[0] ? date.format(customer.appointments[0].startAt) : "—"}</td><td>{customer.appointments.length > 0 ? "履歴あり" : "0"}</td></tr>)}</tbody></table>}</section></main>;
}
