import Link from "next/link";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import { createStaffBooking } from "./actions";

const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ location?: string; service?: string; date?: string; start?: string; error?: string }> }) {
  const context = await getAppointmentAccessContext();
  const query = await searchParams;
  const locations = await db.location.findMany({ where: { organizationId: context.organization.id, ...(context.locationIds ? { id: { in: context.locationIds } } : {}) }, orderBy: { name: "asc" } });
  const location = locations.find(({ id }) => id === query.location) ?? locations[0];
  const services = location ? await db.service.findMany({ where: { organizationId: context.organization.id, locationId: location.id, isActive: true }, orderBy: { name: "asc" } }) : [];
  const service = services.find(({ id }) => id === query.service) ?? services[0];
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = location && service ? await findInternalAvailability({ organizationId: context.organization.id, locationId: location.id, serviceId: service.id, date }) : null;
  const selectedSlot = query.start ? availability?.slots.find((slot) => slot.start.toISOString() === query.start) : undefined;
  return <main className="content narrow-content"><Link className="back-link" href="/app/appointments">← 予約一覧</Link><header className="page-heading"><div><p className="eyebrow">代理登録</p><h1>予約を登録</h1><p className="lead">電話・店頭で受け付けた予約を登録します。</p></div></header>{query.error && <p className="form-error">{query.error}</p>}{locations.length === 0 ? <p className="form-error">利用できる店舗がありません。</p> : <>
    <section className="panel settings-panel"><form className="filter-bar booking-filter"><label>店舗<select name="location" defaultValue={location?.id}>{locations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>サービス<select name="service" defaultValue={service?.id}>{services.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>日付<input name="date" type="date" defaultValue={date} /></label><button className="secondary-button" type="submit">空き枠を表示</button></form><div className="slot-grid">{availability?.slots.map((slot) => <Link className={`slot-button${selectedSlot?.start.getTime() === slot.start.getTime() ? " selected" : ""}`} href={`/app/appointments/new?location=${location!.id}&service=${service!.id}&date=${date}&start=${encodeURIComponent(slot.start.toISOString())}`} key={slot.start.toISOString()}>{time.format(slot.start)}</Link>)}</div>{availability?.slots.length === 0 && <p className="empty-state">予約可能な時間はありません。</p>}</section>
    {selectedSlot && <section className="panel settings-panel booking-customer-panel"><h2 className="panel-title">顧客・受付情報</h2><form action={createStaffBooking} className="settings-form two-columns"><input type="hidden" name="locationId" value={location!.id} /><input type="hidden" name="serviceId" value={service!.id} /><input type="hidden" name="startAt" value={selectedSlot.start.toISOString()} /><label className="settings-field"><span>顧客名</span><input name="customerName" required /></label><label className="settings-field"><span>受付経路</span><select name="source"><option value="PHONE">電話</option><option value="WALK_IN">店頭</option><option value="STAFF">スタッフ登録</option></select></label><label className="settings-field"><span>メールアドレス</span><input name="customerEmail" type="email" /></label><label className="settings-field"><span>電話番号</span><input name="customerPhone" type="tel" /></label><label className="settings-field"><span>顧客からの要望</span><textarea name="customerNote" rows={4} /></label><label className="settings-field"><span>社内メモ</span><textarea name="internalNote" rows={4} /></label><div className="form-actions"><button className="primary-button" type="submit">予約を登録</button></div></form></section>}
  </>}</main>;
}
