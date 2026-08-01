import Link from "next/link";
import { notFound } from "next/navigation";
import { findPublicAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import { createPublicBooking } from "./actions";

const timeFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

export default async function LocationBookingPage({ params, searchParams }: { params: Promise<{ organizationSlug: string; locationSlug: string }>; searchParams: Promise<{ service?: string; date?: string; start?: string; error?: string }> }) {
  const { organizationSlug, locationSlug } = await params;
  const query = await searchParams;
  const location = await db.location.findFirst({ where: { slug: locationSlug, bookingEnabled: true, organization: { slug: organizationSlug } }, include: { organization: true, services: { where: { isActive: true, isPublic: true }, orderBy: { name: "asc" } } } });
  if (!location) notFound();
  const serviceId = query.service ?? location.services[0]?.id;
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = serviceId ? await findPublicAvailability({ organizationSlug, locationSlug, serviceId, date }) : null;
  const selectedSlot = query.start ? availability?.slots.find((slot) => slot.start.toISOString() === query.start) : undefined;
  const selectedService = location.services.find(({ id }) => id === serviceId);
  return <main className="booking-shell"><section className="booking-container"><Link className="back-link" href={`/book/${organizationSlug}`}>← 店舗選択へ</Link><p className="eyebrow">{location.organization.name}</p><h1>{location.name} Web予約</h1>{query.error && <p className="form-error">{query.error}</p>}
    <div className="booking-step"><h2>1. サービス</h2><div className="booking-options compact">{location.services.map((service) => <Link className={`booking-option${service.id === serviceId ? " selected" : ""}`} href={`/book/${organizationSlug}/${locationSlug}?service=${service.id}&date=${date}`} key={service.id}><strong>{service.name}</strong><small>{service.durationMinutes}分{service.priceAmount != null ? `・¥${service.priceAmount.toLocaleString()}` : ""}</small></Link>)}</div>{location.services.length === 0 && <p>現在予約可能なサービスはありません。</p>}</div>
    {selectedService && <div className="booking-step"><h2>2. 日付・時間</h2><form className="date-form"><input type="hidden" name="service" value={serviceId} /><input name="date" type="date" defaultValue={date} required /><button className="secondary-button" type="submit">空き枠を表示</button></form><div className="slot-grid">{availability?.slots.map((slot) => <Link className={`slot-button${selectedSlot?.start.getTime() === slot.start.getTime() ? " selected" : ""}`} href={`/book/${organizationSlug}/${locationSlug}?service=${serviceId}&date=${date}&start=${encodeURIComponent(slot.start.toISOString())}`} key={slot.start.toISOString()}>{timeFormatter.format(slot.start)}</Link>)}</div>{availability?.slots.length === 0 && <p className="empty-state">選択日に予約可能な時間はありません。</p>}</div>}
    {selectedSlot && <div className="booking-step"><h2>3. お客様情報</h2><form action={createPublicBooking} className="settings-form"><input type="hidden" name="organizationSlug" value={organizationSlug} /><input type="hidden" name="locationSlug" value={locationSlug} /><input type="hidden" name="serviceId" value={serviceId} /><input type="hidden" name="startAt" value={selectedSlot.start.toISOString()} /><label className="settings-field"><span>氏名</span><input name="customerName" autoComplete="name" required /></label><label className="settings-field"><span>メールアドレス</span><input name="customerEmail" type="email" autoComplete="email" required /></label><label className="settings-field"><span>電話番号</span><input name="customerPhone" type="tel" autoComplete="tel" /></label><label className="settings-field"><span>ご要望・メモ</span><textarea name="customerNote" rows={4} maxLength={1000} /></label><button className="primary-button" type="submit">この内容で予約する</button></form></div>}
  </section></main>;
}
