import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { Field, Notice } from "@/components/settings-form";
import { saveLocation } from "../actions";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; error?: string; saved?: string; created?: string }> }) {
  const { organization, membership } = await getCurrentContext();
  const query = await searchParams;
  const locations = await db.location.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "asc" } });
  const selected = query.edit ? locations.find((location) => location.id === query.edit) : undefined;
  if (query.edit && !selected) notFound();
  const showForm = Boolean(query.new || selected || locations.length === 0);
  const canEdit = membership.role !== "STAFF";

  return <main className="content">
    <header className="page-heading"><div><p className="eyebrow">設定</p><h1>店舗管理</h1><p className="lead">店舗の基本情報と予約受付条件を管理します。</p></div>{canEdit && <Link className="primary-button" href="/app/settings/locations?new=1">店舗を追加</Link>}</header>
    {query.created && <p className="form-success">企業登録が完了しました。最初の店舗を登録してください。</p>}
    <div className="settings-grid">
      <section className="panel location-list"><h2 className="panel-title">店舗一覧</h2>{locations.length === 0 ? <p className="empty-state">店舗はまだありません。</p> : locations.map((location) => <Link className={`location-list-item${selected?.id === location.id ? " active" : ""}`} href={`/app/settings/locations?edit=${location.id}`} key={location.id}><strong>{location.name}</strong><small>{location.bookingEnabled ? "Web予約 公開中" : "Web予約 非公開"}</small></Link>)}</section>
      {showForm && canEdit && <section className="panel settings-panel"><h2 className="panel-title">{selected ? `${selected.name}を編集` : "新しい店舗"}</h2><Notice error={query.error} saved={query.saved} /><form action={saveLocation} className="settings-form two-columns">
        {selected && <input type="hidden" name="id" value={selected.id} />}
        <Field label="店舗名"><input name="name" defaultValue={selected?.name} required /></Field>
        <Field label="店舗URL用ID"><input name="slug" defaultValue={selected?.slug} required /></Field>
        <Field label="メールアドレス"><input name="email" type="email" defaultValue={selected?.email ?? ""} /></Field>
        <Field label="電話番号"><input name="phone" defaultValue={selected?.phone ?? ""} /></Field>
        <Field label="郵便番号"><input name="postalCode" defaultValue={selected?.postalCode ?? ""} /></Field>
        <Field label="住所"><input name="address" defaultValue={selected?.address ?? ""} /></Field>
        <Field label="タイムゾーン"><select name="timeZone" defaultValue={selected?.timeZone ?? organization.defaultTimeZone}><option value="Asia/Tokyo">Asia/Tokyo</option></select></Field>
        <Field label="予約枠の間隔（分）"><input name="slotIntervalMinutes" type="number" min="5" max="120" defaultValue={selected?.slotIntervalMinutes ?? 15} /></Field>
        <Field label="受付締切（分前）"><input name="minLeadTimeMinutes" type="number" min="0" defaultValue={selected?.minLeadTimeMinutes ?? 60} /></Field>
        <Field label="受付可能日数"><input name="maxAdvanceDays" type="number" min="1" max="730" defaultValue={selected?.maxAdvanceDays ?? 90} /></Field>
        <Field label="予約確定方法"><select name="bookingMode" defaultValue={selected?.bookingMode ?? "MANUAL_CONFIRM"}><option value="MANUAL_CONFIRM">店舗確認後に確定</option><option value="AUTO_CONFIRM">自動で確定</option></select></Field>
        <label className="checkbox-field"><input name="bookingEnabled" type="checkbox" defaultChecked={selected?.bookingEnabled ?? false} /> Web予約を公開する</label>
        <div className="form-actions"><button className="primary-button" type="submit">店舗を保存</button></div>
      </form></section>}
    </div>
  </main>;
}
