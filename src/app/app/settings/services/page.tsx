import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { Field, Notice } from "@/components/settings-form";
import { db } from "@/lib/db/client";
import { saveService, toggleService } from "./actions";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; error?: string; saved?: string }> }) {
  const { organization } = await requireOrganizationManager();
  const query = await searchParams;
  const [services, locations] = await Promise.all([
    db.service.findMany({ where: { organizationId: organization.id }, include: { location: { select: { name: true } } }, orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
    db.location.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const selected = query.edit ? services.find(({ id }) => id === query.edit) : undefined;
  if (query.edit && !selected) notFound();
  const showForm = Boolean(query.new || selected);
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">設定</p><h1>サービス管理</h1><p className="lead">予約メニューの時間、料金、公開状態を管理します。</p></div>{locations.length > 0 && <Link className="primary-button" href="/app/settings/services?new=1">サービスを追加</Link>}</header>
    {locations.length === 0 && <p className="form-error">サービスを登録する前に店舗を作成してください。</p>}
    <div className="settings-grid"><section className="panel location-list"><h2 className="panel-title">サービス一覧</h2>{services.length === 0 ? <p className="empty-state">サービスはまだありません。</p> : services.map((service) => <Link className={`location-list-item${selected?.id === service.id ? " active" : ""}`} href={`/app/settings/services?edit=${service.id}`} key={service.id}><strong>{service.name}</strong><small>{service.location.name}・{service.durationMinutes}分・{service.isActive ? service.isPublic ? "公開" : "非公開" : "停止中"}</small></Link>)}</section>
      {showForm && <section className="panel settings-panel"><h2 className="panel-title">{selected ? `${selected.name}を編集` : "新しいサービス"}</h2><Notice error={query.error} saved={query.saved} /><form action={saveService} className="settings-form two-columns">{selected && <input type="hidden" name="id" value={selected.id} />}
        <Field label="店舗"><select name="locationId" defaultValue={selected?.locationId ?? locations[0]?.id} required>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></Field>
        <Field label="サービス名"><input name="name" defaultValue={selected?.name} required /></Field>
        <Field label="所要時間（分）"><input name="durationMinutes" type="number" min="5" max="1440" defaultValue={selected?.durationMinutes ?? 60} required /></Field>
        <Field label="料金目安（円）"><input name="priceAmount" type="number" min="0" defaultValue={selected?.priceAmount ?? ""} /></Field>
        <Field label="準備時間（分）"><input name="bufferBeforeMinutes" type="number" min="0" defaultValue={selected?.bufferBeforeMinutes ?? 0} /></Field>
        <Field label="片付け時間（分）"><input name="bufferAfterMinutes" type="number" min="0" defaultValue={selected?.bufferAfterMinutes ?? 0} /></Field>
        <Field label="必要スタッフ数"><input name="requiredStaffCount" type="number" min="1" max="20" defaultValue={selected?.requiredStaffCount ?? 1} /></Field>
        <Field label="表示色"><select name="color" defaultValue={selected?.color ?? "blue"}><option value="blue">青</option><option value="green">緑</option><option value="orange">オレンジ</option><option value="purple">紫</option><option value="pink">ピンク</option><option value="gray">グレー</option></select></Field>
        <Field label="説明"><textarea name="description" rows={4} defaultValue={selected?.description ?? ""} /></Field>
        <div className="check-stack"><label className="checkbox-field"><input name="isPublic" type="checkbox" defaultChecked={selected?.isPublic ?? true} />公開予約ページに表示する</label><label className="checkbox-field"><input name="isActive" type="checkbox" defaultChecked={selected?.isActive ?? true} />サービスを有効にする</label></div>
        <div className="form-actions action-row"><button className="primary-button" type="submit">サービスを保存</button></div>
      </form>{selected && <form action={toggleService} className="deactivate-form"><input type="hidden" name="id" value={selected.id} /><button className={`text-button${selected.isActive ? " danger" : ""}`} type="submit">{selected.isActive ? "サービスを停止" : "サービスを再開"}</button></form>}</section>}
    </div>
  </main>;
}
