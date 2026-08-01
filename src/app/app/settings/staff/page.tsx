import Link from "next/link";
import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { Field, Notice } from "@/components/settings-form";
import { inviteStaff, revokeInvitation, updateStaff } from "./actions";

const roleLabels = { OWNER: "OWNER", ADMIN: "管理者", STAFF: "スタッフ" } as const;

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string; saved?: string; invitation?: string; sent?: string }> }) {
  const { organization, membership: actor } = await requireOrganizationManager();
  const query = await searchParams;
  const [members, locations, services, invitations] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: organization.id }, include: { user: true }, orderBy: { createdAt: "asc" },
    }),
    db.location.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "asc" } }),
    db.service.findMany({ where: { organizationId: organization.id, isActive: true }, include: { location: { select: { name: true } } }, orderBy: { name: "asc" } }),
    db.organizationInvitation.findMany({
      where: { organizationId: organization.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const selected = members.find(({ userId }) => userId === query.edit) ?? members[0];
  const [memberships, skills] = selected ? await Promise.all([
    db.locationMember.findMany({ where: { userId: selected.userId, location: { organizationId: organization.id } }, select: { locationId: true } }),
    db.serviceStaff.findMany({ where: { userId: selected.userId, service: { organizationId: organization.id } }, select: { serviceId: true } }),
  ]) : [[], []];
  const selectedLocationIds = new Set(memberships.map(({ locationId }) => locationId));
  const selectedServiceIds = new Set(skills.map(({ serviceId }) => serviceId));
  const canManage = actor.role !== "STAFF";
  const canEditSelected = canManage && (actor.role === "OWNER" || selected?.role !== "OWNER");

  return <main className="content">
    <header className="page-heading"><div><p className="eyebrow">設定</p><h1>スタッフ管理</h1><p className="lead">スタッフの招待、権限、所属店舗を管理します。</p></div></header>
    <Notice error={query.error} saved={query.saved} />
    {query.sent && <p className="form-success">招待メールを送信しました。</p>}
    {query.invitation && <section className="invite-result"><strong>招待を作成しました</strong><p>メール送信連携前のため、次のURLを対象者へ安全な方法で共有してください。この画面を離れると再表示できません。</p><code>{`${process.env.APP_URL ?? "http://localhost:3000"}/invite/${query.invitation}`}</code></section>}
    <div className="staff-layout">
      <section className="panel location-list"><h2 className="panel-title">スタッフ</h2>{members.map((member) => <Link className={`location-list-item${selected?.userId === member.userId ? " active" : ""}`} href={`/app/settings/staff?edit=${member.userId}`} key={member.userId}><strong>{member.user.name}</strong><small>{roleLabels[member.role]}・{member.isActive ? "有効" : "停止中"}</small></Link>)}</section>
      <div className="staff-main">
        {selected && <section className="panel settings-panel"><div className="panel-title-row"><h2 className="panel-title">{selected.user.name}</h2><Link className="secondary-button" href={`/app/settings/staff-availability?user=${selected.userId}`}>勤務・休暇</Link></div><p className="member-email">{selected.user.email}</p><form action={updateStaff} className="settings-form"><input type="hidden" name="userId" value={selected.userId} />
          <Field label="企業権限"><select name="role" defaultValue={selected.role} disabled={!canEditSelected}><option value="STAFF">スタッフ</option><option value="ADMIN">管理者</option>{(actor.role === "OWNER" || selected.role === "OWNER") && <option value="OWNER">OWNER</option>}</select></Field>
          <fieldset className="location-fieldset"><legend>所属店舗</legend>{locations.length === 0 ? <p className="empty-state">店舗を先に登録してください。</p> : locations.map((location) => <label className="checkbox-field" key={location.id}><input name="locationIds" type="checkbox" value={location.id} defaultChecked={selectedLocationIds.has(location.id)} disabled={!canEditSelected} />{location.name}</label>)}</fieldset>
          <fieldset className="location-fieldset"><legend>対応可能サービス</legend>{services.length === 0 ? <p className="empty-state">サービスを先に登録してください。</p> : services.map((service) => <label className="checkbox-field" key={service.id}><input name="serviceIds" type="checkbox" value={service.id} defaultChecked={selectedServiceIds.has(service.id)} disabled={!canEditSelected} />{service.name}<small>（{service.location.name}）</small></label>)}</fieldset>
          <label className="checkbox-field"><input name="isActive" type="checkbox" defaultChecked={selected.isActive} disabled={!canEditSelected} />アカウントを有効にする</label>
          {canEditSelected && <div><button className="primary-button" type="submit">スタッフ情報を保存</button></div>}
        </form></section>}
        {canManage && <section className="panel settings-panel"><h2 className="panel-title">スタッフを招待</h2><form action={inviteStaff} className="settings-form two-columns"><Field label="メールアドレス"><input name="email" type="email" required /></Field><Field label="企業権限"><select name="role" defaultValue="STAFF"><option value="STAFF">スタッフ</option><option value="ADMIN">管理者</option>{actor.role === "OWNER" && <option value="OWNER">OWNER</option>}</select></Field><div className="form-actions"><button className="primary-button" type="submit">招待を作成</button></div></form>
          {invitations.length > 0 && <div className="invitation-list"><h3>承認待ち</h3>{invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><div><strong>{invitation.email}</strong><small>{roleLabels[invitation.role]}・有効期限 {invitation.expiresAt.toLocaleDateString("ja-JP")}</small></div><form action={revokeInvitation}><input type="hidden" name="id" value={invitation.id} /><button className="text-button danger" type="submit">取消</button></form></div>)}</div>}
        </section>}
      </div>
    </div>
  </main>;
}
