// Demo data for local development. Run via `npx prisma db seed` (also runs after `prisma migrate reset`).
import "dotenv/config";
import { reserveSlot } from "@/lib/appointments/reserve";
import { hashPassword } from "@/lib/auth/password";
import { createToken, hashToken } from "@/lib/auth/token";
import { localDateTime } from "@/lib/availability/date";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import type { AppointmentStatus } from "../generated/prisma/client";

const PASSWORD = "password1234";
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weeklyHours(days: number[], startTime: string, endTime: string) {
  return days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime }));
}

async function main() {
  if (await db.organization.findUnique({ where: { slug: "demo" } })) {
    console.log("Seed skipped: organization 'demo' already exists. Run `npx prisma migrate reset` to start over.");
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);
  const verified = { passwordHash, emailVerifiedAt: new Date() };
  const [owner, admin, sato, suzuki] = await Promise.all([
    db.user.create({ data: { name: "山田 太郎", email: "owner@example.com", ...verified } }),
    db.user.create({ data: { name: "高橋 花子", email: "admin@example.com", ...verified } }),
    db.user.create({ data: { name: "佐藤 健", email: "sato@example.com", ...verified } }),
    db.user.create({ data: { name: "鈴木 美咲", email: "suzuki@example.com", ...verified } }),
  ]);

  const organization = await db.organization.create({
    data: {
      name: "デモサロン",
      slug: "demo",
      members: { create: [
        { userId: owner.id, role: "OWNER" },
        { userId: admin.id, role: "ADMIN" },
        { userId: sato.id, role: "STAFF" },
        { userId: suzuki.id, role: "STAFF" },
      ] },
    },
  });

  const aoyamaHours = weeklyHours([1, 2, 3, 4, 5, 6], "10:00", "19:00");
  const shibuyaHours = weeklyHours([0, 2, 3, 4, 5, 6], "11:00", "20:00");
  const aoyama = await db.location.create({
    data: {
      organizationId: organization.id, name: "青山店", slug: "aoyama", phone: "03-0000-0001", address: "東京都港区南青山1-1-1",
      bookingEnabled: true, bookingMode: "AUTO_CONFIRM", cancellationDeadlineMinutes: 1440,
      businessHours: { create: aoyamaHours },
      scheduleExceptions: { create: { date: new Date(`${addDays(today, 30)}T00:00:00.000Z`), type: "CLOSED", note: "設備点検のため休業" } },
    },
  });
  const shibuya = await db.location.create({
    data: {
      organizationId: organization.id, name: "渋谷店", slug: "shibuya", phone: "03-0000-0002", address: "東京都渋谷区道玄坂2-2-2",
      bookingEnabled: true, bookingMode: "MANUAL_CONFIRM", cancellationDeadlineMinutes: 1440,
      businessHours: { create: shibuyaHours },
    },
  });

  // Suzuki works at both locations, so cross-location double booking is covered by the demo data.
  const staffing = [
    { location: aoyama, hours: aoyamaHours, users: [admin, sato, suzuki] },
    { location: shibuya, hours: shibuyaHours, users: [suzuki] },
  ];
  for (const { location, hours, users } of staffing) {
    await db.locationMember.createMany({ data: users.map((user, index) => ({ locationId: location.id, userId: user.id, displayOrder: index, isPubliclyBookable: true })) });
    await db.staffSchedule.createMany({ data: users.flatMap((user) => hours.map((hour) => ({ ...hour, locationId: location.id, userId: user.id }))) });
  }
  await db.locationMember.create({ data: { locationId: shibuya.id, userId: owner.id } });
  await db.staffTimeOff.create({ data: { locationId: aoyama.id, userId: sato.id, type: "PAID_LEAVE", note: "有給休暇", startAt: localDateTime(addDays(today, 25), "00:00"), endAt: localDateTime(addDays(today, 26), "00:00") } });

  const shampoo = await db.resourceType.create({ data: { organizationId: organization.id, name: "シャンプー台" } });
  await db.resource.createMany({ data: ["シャンプー台A", "シャンプー台B"].map((name) => ({ organizationId: organization.id, locationId: aoyama.id, resourceTypeId: shampoo.id, name })) });

  const base = { organizationId: organization.id };
  const cut = await db.service.create({ data: { ...base, locationId: aoyama.id, name: "カット", description: "シャンプー・ブロー込み", durationMinutes: 60, bufferAfterMinutes: 10, priceAmount: 5500, color: "blue", staff: { create: [{ userId: admin.id }, { userId: sato.id }, { userId: suzuki.id }] } } });
  const color = await db.service.create({ data: { ...base, locationId: aoyama.id, name: "カラー", durationMinutes: 90, bufferAfterMinutes: 15, priceAmount: 8800, color: "purple", staff: { create: [{ userId: sato.id }, { userId: suzuki.id }] }, resourceRequirements: { create: { resourceTypeId: shampoo.id } } } });
  await db.service.create({ data: { ...base, locationId: aoyama.id, name: "ヘッドスパ（準備中）", durationMinutes: 45, priceAmount: 4400, color: "green", isPublic: false, staff: { create: [{ userId: suzuki.id }] } } });
  const shibuyaCut = await db.service.create({ data: { ...base, locationId: shibuya.id, name: "カット", durationMinutes: 60, bufferAfterMinutes: 10, priceAmount: 5000, color: "blue", staff: { create: [{ userId: suzuki.id }] } } });

  const customers = await Promise.all([
    { name: "伊藤 さくら", nameKana: "イトウ サクラ", email: "sakura@example.com", phone: "090-0000-0001", note: "カラー剤で軽いかぶれ歴あり" },
    { name: "渡辺 翔", nameKana: "ワタナベ ショウ", email: "sho@example.com", phone: "090-0000-0002" },
    { name: "中村 結衣", nameKana: "ナカムラ ユイ", email: "yui@example.com" },
    { name: "小林 大輔", nameKana: "コバヤシ ダイスケ", phone: "090-0000-0004" },
    { name: "加藤 葵", nameKana: "カトウ アオイ", email: "aoi@example.com", phone: "090-0000-0005" },
  ].map((data) => db.customer.create({ data: { ...base, ...data } })));

  // Upcoming appointments go through the real availability calculation, so they never violate business rules.
  const upcoming: Array<{ serviceId: string; locationId: string; customer: number; fromDay: number; time: string; status: AppointmentStatus; source: "WEB" | "PHONE" | "WALK_IN" | "STAFF"; preferred?: string; note?: string }> = [
    { serviceId: cut.id, locationId: aoyama.id, customer: 0, fromDay: 1, time: "10:00", status: "CONFIRMED", source: "WEB" },
    { serviceId: color.id, locationId: aoyama.id, customer: 1, fromDay: 1, time: "13:00", status: "CONFIRMED", source: "PHONE", preferred: sato.id, note: "前回と同じ色味希望" },
    { serviceId: color.id, locationId: aoyama.id, customer: 2, fromDay: 1, time: "13:00", status: "CONFIRMED", source: "WEB" },
    { serviceId: cut.id, locationId: aoyama.id, customer: 3, fromDay: 2, time: "15:00", status: "CONFIRMED", source: "WALK_IN" },
    { serviceId: shibuyaCut.id, locationId: shibuya.id, customer: 4, fromDay: 2, time: "17:00", status: "PENDING", source: "WEB" },
    { serviceId: shibuyaCut.id, locationId: shibuya.id, customer: 0, fromDay: 4, time: "12:00", status: "PENDING", source: "WEB" },
  ];
  for (const spec of upcoming) {
    let found;
    for (let day = spec.fromDay; day < spec.fromDay + 14 && !found; day += 1) {
      const date = addDays(today, day);
      const availability = await findInternalAvailability({ organizationId: organization.id, locationId: spec.locationId, serviceId: spec.serviceId, date });
      const slot = availability?.slots.find((item) => item.start.getTime() === localDateTime(date, spec.time).getTime());
      if (availability && slot) found = { service: availability.service, slot };
    }
    if (!found) throw new Error(`No available slot for seed appointment at ${spec.time}`);
    const { service, slot } = found;
    await db.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({ data: {
        ...base, locationId: spec.locationId, serviceId: service.id, customerId: customers[spec.customer].id, status: spec.status, source: spec.source,
        startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd,
        serviceNameSnapshot: service.name, durationMinutesSnapshot: service.durationMinutes, priceAmountSnapshot: service.priceAmount, currencySnapshot: service.currency,
        preferredStaffId: spec.preferred, customerNote: spec.note, managementTokenHash: hashToken(createToken()), createdById: spec.source === "WEB" ? null : admin.id,
      } });
      await reserveSlot(tx, appointment.id, service, slot, { assignedById: spec.source === "WEB" ? undefined : admin.id, preferredUserId: spec.preferred });
      await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, toStatus: spec.status, changedById: spec.source === "WEB" ? null : admin.id } });
    });
  }

  // Past appointments are written directly: availability only offers future slots.
  const past: Array<{ daysAgo: number; customer: number; staff: string; status: AppointmentStatus }> = [
    { daysAgo: 14, customer: 0, staff: sato.id, status: "COMPLETED" },
    { daysAgo: 7, customer: 1, staff: suzuki.id, status: "COMPLETED" },
    { daysAgo: 3, customer: 3, staff: sato.id, status: "NO_SHOW" },
    { daysAgo: 2, customer: 2, staff: suzuki.id, status: "CANCELLED" },
  ];
  for (const item of past) {
    const date = addDays(today, -item.daysAgo);
    const startAt = localDateTime(date, "11:00");
    const endAt = localDateTime(date, "12:00");
    const occupancyEndAt = localDateTime(date, "12:10");
    const cancelled = item.status === "CANCELLED";
    await db.appointment.create({ data: {
      ...base, locationId: aoyama.id, serviceId: cut.id, customerId: customers[item.customer].id, status: item.status, source: "WEB",
      startAt, endAt, occupancyStartAt: startAt, occupancyEndAt,
      serviceNameSnapshot: cut.name, durationMinutesSnapshot: cut.durationMinutes, priceAmountSnapshot: cut.priceAmount, currencySnapshot: cut.currency,
      managementTokenHash: hashToken(createToken()),
      ...(cancelled ? { cancelledAt: localDateTime(addDays(date, -1), "18:00"), cancellationReason: "顧客によるキャンセル" } : { assignments: { create: { userId: item.staff, occupancyStartAt: startAt, occupancyEndAt } } }),
      statusHistory: { create: [{ toStatus: "CONFIRMED" }, { fromStatus: "CONFIRMED", toStatus: item.status, changedById: cancelled ? null : admin.id }] },
    } });
  }

  console.log(`Seeded organization 'demo'. Log in as owner@example.com / admin@example.com / sato@example.com / suzuki@example.com (password: ${PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
