import { getCurrentContext } from "@/lib/auth/context";
import { Field, Notice } from "@/components/settings-form";
import { updateOrganization } from "../actions";

export default async function OrganizationSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { organization, membership } = await getCurrentContext();
  const query = await searchParams;
  const canEdit = membership.role !== "STAFF";
  return <main className="content narrow-content">
    <header className="page-heading"><div><p className="eyebrow">設定</p><h1>企業設定</h1><p className="lead">企業の基本情報と公開URLを管理します。</p></div></header>
    <section className="panel settings-panel">
      <Notice {...query} />
      <form action={updateOrganization} className="settings-form">
        <Field label="企業名"><input name="name" defaultValue={organization.name} disabled={!canEdit} required /></Field>
        <Field label="企業URL用ID" hint={`/book/${organization.slug}`}><input name="slug" defaultValue={organization.slug} disabled={!canEdit} required /></Field>
        <Field label="標準タイムゾーン"><select name="defaultTimeZone" defaultValue={organization.defaultTimeZone} disabled={!canEdit}><option value="Asia/Tokyo">Asia/Tokyo</option></select></Field>
        {canEdit && <div><button className="primary-button" type="submit">変更を保存</button></div>}
      </form>
    </section>
  </main>;
}
