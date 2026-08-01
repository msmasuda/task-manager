import Link from "next/link";
import { requireOrganizationManager } from "@/lib/auth/context";
import { Notice } from "@/components/settings-form";
import { db } from "@/lib/db/client";
import { addTimeOff, deleteTimeOff, saveStaffSchedule } from "./actions";

const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const typeLabels = { BREAK: "休憩", PAID_LEAVE: "有給休暇", SICK_LEAVE: "病気休暇", OTHER: "その他" } as const;
const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });

export default async function StaffAvailabilityPage({ searchParams }: { searchParams: Promise<{ user?: string; location?: string; error?: string; saved?: string }> }) {
  const { organization } = await requireOrganizationManager();
  const query = await searchParams;
  const members = await db.organizationMember.findMany({
    where: { organizationId: organization.id, isActive: true }, include: { user: { include: { locationMemberships: { where: { location: { organizationId: organization.id } }, include: { location: true } } } } }, orderBy: { createdAt: "asc" },
  });
  const selectedMember = members.find(({ userId }) => userId === query.user) ?? members.find(({ user }) => user.locationMemberships.length > 0);
  const memberLocations = selectedMember?.user.locationMemberships.map(({ location }) => location) ?? [];
  const selectedLocation = memberLocations.find(({ id }) => id === query.location) ?? memberLocations[0];
  const [schedules, timeOffs] = selectedMember && selectedLocation ? await Promise.all([
    db.staffSchedule.findMany({ where: { userId: selectedMember.userId, locationId: selectedLocation.id }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    db.staffTimeOff.findMany({ where: { userId: selectedMember.userId, locationId: selectedLocation.id, endAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take: 50 }),
  ]) : [[], []];

  return <main className="content"><header className="page-heading"><div><p className="eyebrow">設定</p><h1>スタッフ勤務・休暇</h1><p className="lead">店舗ごとの勤務時間と休憩・休暇を管理します。</p></div></header>
    <nav className="location-tabs" aria-label="スタッフ選択">{members.map((member) => <Link className={selectedMember?.userId === member.userId ? "active" : ""} href={`/app/settings/staff-availability?user=${member.userId}`} key={member.userId}>{member.user.name}</Link>)}</nav>
    {!selectedMember || memberLocations.length === 0 ? <section className="panel settings-panel"><p>勤務設定にはスタッフの店舗所属が必要です。</p><Link className="primary-button" href="/app/settings/staff">所属店舗を設定</Link></section> : <>
      <nav className="location-tabs" aria-label="所属店舗">{memberLocations.map((location) => <Link className={selectedLocation?.id === location.id ? "active" : ""} href={`/app/settings/staff-availability?user=${selectedMember.userId}&location=${location.id}`} key={location.id}>{location.name}</Link>)}</nav><Notice error={query.error} saved={query.saved} />
      <div className="schedule-layout"><section className="panel settings-panel"><h2 className="panel-title">週間勤務時間</h2><form action={saveStaffSchedule} className="hours-form"><input type="hidden" name="userId" value={selectedMember.userId} /><input type="hidden" name="locationId" value={selectedLocation!.id} />{days.map((day, dayIndex) => { const daySchedules = schedules.filter((schedule) => schedule.dayOfWeek === dayIndex); return <div className="hours-row" key={day}><strong>{day}</strong><div className="hours-slots">{[0, 1].map((slot) => { const schedule = daySchedules[slot]; return <div className="hour-slot" key={slot}><label className="checkbox-field"><input name={`enabled_${dayIndex}_${slot}`} type="checkbox" defaultChecked={Boolean(schedule)} />{slot ? "追加枠" : "勤務"}</label><input name={`start_${dayIndex}_${slot}`} aria-label={`${day}の勤務開始`} type="time" defaultValue={schedule?.startTime ?? (slot ? "13:00" : "09:00")} /><span>〜</span><input name={`end_${dayIndex}_${slot}`} aria-label={`${day}の勤務終了`} type="time" defaultValue={schedule?.endTime ?? "18:00"} /></div>; })}</div></div>; })}<button className="primary-button" type="submit">勤務時間を保存</button></form></section>
        <div className="staff-main"><section className="panel settings-panel"><h2 className="panel-title">休憩・休暇を追加</h2><form action={addTimeOff} className="settings-form"><input type="hidden" name="userId" value={selectedMember.userId} /><input type="hidden" name="locationId" value={selectedLocation!.id} /><label className="settings-field"><span>開始日時</span><input name="startAt" type="datetime-local" required /></label><label className="settings-field"><span>終了日時</span><input name="endAt" type="datetime-local" required /></label><label className="settings-field"><span>種別</span><select name="type"><option value="BREAK">休憩</option><option value="PAID_LEAVE">有給休暇</option><option value="SICK_LEAVE">病気休暇</option><option value="OTHER">その他</option></select></label><label className="settings-field"><span>メモ</span><input name="note" maxLength={200} /></label><button className="primary-button" type="submit">追加</button></form></section>
          <section className="panel settings-panel"><h2 className="panel-title">今後の休憩・休暇</h2>{timeOffs.length === 0 ? <p className="empty-state">登録はありません。</p> : timeOffs.map((timeOff) => <div className="invitation-row" key={timeOff.id}><div><strong>{typeLabels[timeOff.type]}</strong><small>{dateTime.format(timeOff.startAt)} 〜 {dateTime.format(timeOff.endAt)}{timeOff.note ? `・${timeOff.note}` : ""}</small></div><form action={deleteTimeOff}><input type="hidden" name="id" value={timeOff.id} /><input type="hidden" name="userId" value={selectedMember.userId} /><input type="hidden" name="locationId" value={selectedLocation!.id} /><button className="text-button danger" type="submit">削除</button></form></div>)}</section></div>
      </div>
    </>}
  </main>;
}
