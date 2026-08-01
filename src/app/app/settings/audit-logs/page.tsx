import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";

const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium" });

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { organization } = await requireOrganizationManager();
  const { action } = await searchParams;
  const query = action?.trim().slice(0, 100) ?? "";
  const logs = await db.auditLog.findMany({ where: { organizationId: organization.id, ...(query ? { action: { contains: query, mode: "insensitive" } } : {}) }, include: { actor: true, location: true }, orderBy: { createdAt: "desc" }, take: 500 });
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">セキュリティ</p><h1>操作履歴</h1><p className="lead">企業内で行われた重要な操作を確認します。</p></div></header><form className="filter-bar customer-search"><label>操作名<input name="action" defaultValue={query} placeholder="例: appointment" /></label><button className="secondary-button" type="submit">検索</button></form><section className="panel appointment-table-wrap">{logs.length === 0 ? <p className="empty-state">操作履歴はありません。</p> : <table className="data-table"><thead><tr><th>日時</th><th>操作</th><th>実行者</th><th>店舗</th><th>対象</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{dateTime.format(log.createdAt)}</td><td><code>{log.action}</code></td><td>{log.actor?.name ?? "システム・顧客"}</td><td>{log.location?.name ?? "—"}</td><td>{log.entityType}<small>{log.entityId}</small></td></tr>)}</tbody></table>}</section></main>;
}
