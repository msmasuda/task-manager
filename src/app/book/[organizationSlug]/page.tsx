import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";

export default async function OrganizationBookingPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params;
  const organization = await db.organization.findUnique({ where: { slug: organizationSlug }, include: { locations: { where: { bookingEnabled: true }, orderBy: { name: "asc" } } } });
  if (!organization) notFound();
  return <main className="booking-shell"><section className="booking-container"><p className="eyebrow">WEB予約</p><h1>{organization.name}</h1><p className="lead auth-lead">予約する店舗を選択してください。</p><div className="booking-options">{organization.locations.map((location) => <Link className="booking-option" href={`/book/${organization.slug}/${location.slug}`} key={location.id}><strong>{location.name}</strong>{location.address && <small>{location.address}</small>}</Link>)}{organization.locations.length === 0 && <p>現在Web予約を受け付けている店舗はありません。</p>}</div></section></main>;
}
