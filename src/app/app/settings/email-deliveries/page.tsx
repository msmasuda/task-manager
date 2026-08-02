import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";

const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium" });
const labels = { PENDING: "送信待ち", SENT: "送信済み", FAILED: "失敗" } as const;

export default async function EmailDeliveriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { organization } = await requireOrganizationManager();
  const query = await searchParams;
  const status = ["PENDING", "SENT", "FAILED"].includes(query.status ?? "") ? query.status as "PENDING" | "SENT" | "FAILED" : undefined;
  const deliveries = await db.emailDelivery.findMany({ where: { organizationId: organization.id, status }, orderBy: { createdAt: "desc" }, take: 500 });
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">メール</p><h1>メール送信履歴</h1><p className="lead">予約・招待・認証メールの送信結果を確認します。</p></div></header><form className="filter-bar"><label>送信状態<select name="status" defaultValue={status ?? ""}><option value="">すべて</option><option value="PENDING">送信待ち</option><option value="SENT">送信済み</option><option value="FAILED">失敗</option></select></label><button className="secondary-button" type="submit">表示</button></form><section className="panel appointment-table-wrap">{deliveries.length === 0 ? <p className="empty-state">メール送信履歴はありません。</p> : <table className="data-table"><thead><tr><th>日時</th><th>宛先</th><th>テンプレート</th><th>状態</th><th>試行</th><th>エラー</th></tr></thead><tbody>{deliveries.map((delivery) => <tr key={delivery.id}><td>{dateTime.format(delivery.createdAt)}</td><td>{delivery.recipient}</td><td><code>{delivery.template}</code></td><td><span className={`status ${delivery.status === "FAILED" ? "pending" : "confirmed"}`}>{labels[delivery.status]}</span></td><td>{delivery.attempts}</td><td className="error-cell">{delivery.lastError ?? "—"}</td></tr>)}</tbody></table>}</section></main>;
}
