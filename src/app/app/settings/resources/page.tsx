import Link from "next/link";
import { requireOrganizationManager } from "@/lib/auth/context";
import { Field, Notice } from "@/components/settings-form";
import { db } from "@/lib/db/client";
import { createResourceType, deleteServiceRequirement, saveResource, saveServiceRequirement } from "./actions";

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; error?: string; saved?: string }> }) {
  const { organization } = await requireOrganizationManager();
  const query = await searchParams;
  const [resources, types, locations, services, requirements] = await Promise.all([
    db.resource.findMany({ where: { organizationId: organization.id }, include: { location: true, resourceType: true }, orderBy: { name: "asc" } }),
    db.resourceType.findMany({ where: { organizationId: organization.id }, orderBy: { name: "asc" } }),
    db.location.findMany({ where: { organizationId: organization.id }, orderBy: { name: "asc" } }),
    db.service.findMany({ where: { organizationId: organization.id, isActive: true }, include: { location: true }, orderBy: { name: "asc" } }),
    db.serviceResourceRequirement.findMany({ where: { service: { organizationId: organization.id } }, include: { service: true, resourceType: true }, orderBy: { service: { name: "asc" } } }),
  ]);
  const selected = resources.find(({ id }) => id === query.edit);
  const showForm = Boolean(query.new || selected);
  return <main className="content"><header className="page-heading"><div><p className="eyebrow">設定</p><h1>設備・部屋</h1><p className="lead">部屋、席、機器などの共有設備とサービスごとの必要数を管理します。</p></div>{types.length > 0 && locations.length > 0 && <Link className="primary-button" href="/app/settings/resources?new=1">設備を追加</Link>}</header><Notice error={query.error} saved={query.saved} />
    <div className="resource-layout"><div className="staff-main"><section className="panel settings-panel"><h2 className="panel-title">設備種別</h2><form action={createResourceType} className="inline-form"><input name="name" placeholder="例：診察室、作業ベイ" required /><button className="secondary-button" type="submit">種別を追加</button></form><div className="tag-list">{types.map((type) => <span key={type.id}>{type.name}</span>)}</div></section>
      <section className="panel location-list"><h2 className="panel-title">設備一覧</h2>{resources.length === 0 ? <p className="empty-state">設備はまだありません。</p> : resources.map((resource) => <Link className={`location-list-item${selected?.id === resource.id ? " active" : ""}`} href={`/app/settings/resources?edit=${resource.id}`} key={resource.id}><strong>{resource.name}</strong><small>{resource.location.name}・{resource.resourceType.name}・{resource.isActive ? "有効" : "停止中"}</small></Link>)}</section></div>
      <div className="staff-main">{showForm && <section className="panel settings-panel"><h2 className="panel-title">{selected ? `${selected.name}を編集` : "新しい設備"}</h2><form action={saveResource} className="settings-form two-columns">{selected && <input type="hidden" name="id" value={selected.id} />}<Field label="設備名"><input name="name" defaultValue={selected?.name} required /></Field><Field label="店舗"><select name="locationId" defaultValue={selected?.locationId ?? locations[0]?.id}>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></Field><Field label="設備種別"><select name="resourceTypeId" defaultValue={selected?.resourceTypeId ?? types[0]?.id}>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></Field><label className="checkbox-field"><input name="isActive" type="checkbox" defaultChecked={selected?.isActive ?? true} />設備を有効にする</label><div className="form-actions"><button className="primary-button" type="submit">設備を保存</button></div></form></section>}
        <section className="panel settings-panel"><h2 className="panel-title">サービスの設備要件</h2>{services.length > 0 && types.length > 0 ? <form action={saveServiceRequirement} className="requirement-form"><select name="serviceId">{services.map((service) => <option value={service.id} key={service.id}>{service.name}（{service.location.name}）</option>)}</select><select name="resourceTypeId">{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select><input aria-label="必要数" name="quantity" type="number" min="1" max="100" defaultValue="1" /><button className="secondary-button" type="submit">設定</button></form> : <p className="empty-state">サービスと設備種別を登録してください。</p>}
          <div className="requirement-list">{requirements.map((requirement) => <div className="invitation-row" key={`${requirement.serviceId}-${requirement.resourceTypeId}`}><div><strong>{requirement.service.name}</strong><small>{requirement.resourceType.name} × {requirement.quantity}</small></div><form action={deleteServiceRequirement}><input type="hidden" name="serviceId" value={requirement.serviceId} /><input type="hidden" name="resourceTypeId" value={requirement.resourceTypeId} /><button className="text-button danger" type="submit">削除</button></form></div>)}</div>
        </section></div>
    </div>
  </main>;
}
