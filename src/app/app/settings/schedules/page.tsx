import { format } from "date-fns";
import Link from "next/link";
import { requireOrganizationManager } from "@/lib/auth/context";
import { Notice } from "@/components/settings-form";
import { db } from "@/lib/db/client";
import { addScheduleException, deleteScheduleException, saveBusinessHours } from "./actions";

const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ location?: string; error?: string; saved?: string }> }) {
  const { organization } = await requireOrganizationManager();
  const query = await searchParams;
  const locations = await db.location.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "asc" } });
  const selected = locations.find(({ id }) => id === query.location) ?? locations[0];
  const [hours, exceptions] = selected ? await Promise.all([
    db.businessHours.findMany({ where: { locationId: selected.id }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    db.locationScheduleException.findMany({ where: { locationId: selected.id, date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 50 }),
  ]) : [[], []];

  return <main className="content"><header className="page-heading"><div><p className="eyebrow">設定</p><h1>営業時間・例外日</h1><p className="lead">通常の営業時間と、休業日・臨時営業時間を設定します。</p></div></header>
    {locations.length === 0 ? <section className="panel settings-panel"><p>先に店舗を登録してください。</p><Link className="primary-button" href="/app/settings/locations?new=1">店舗を追加</Link></section> : <>
      <nav className="location-tabs" aria-label="店舗選択">{locations.map((location) => <Link className={selected?.id === location.id ? "active" : ""} href={`/app/settings/schedules?location=${location.id}`} key={location.id}>{location.name}</Link>)}</nav>
      <Notice error={query.error} saved={query.saved} />
      <div className="schedule-layout"><section className="panel settings-panel"><h2 className="panel-title">通常営業時間</h2><p className="section-help">チェックを外した曜日は休業です。終了時刻が開始時刻より前の場合は翌日終了として扱います。</p><form action={saveBusinessHours} className="hours-form"><input type="hidden" name="locationId" value={selected!.id} />
        {days.map((day, dayIndex) => { const dayHours = hours.filter((hour) => hour.dayOfWeek === dayIndex); return <div className="hours-row" key={day}><strong>{day}</strong><div className="hours-slots">{[0, 1].map((slot) => { const hour = dayHours[slot]; return <div className="hour-slot" key={slot}><label className="checkbox-field"><input name={`enabled_${dayIndex}_${slot}`} type="checkbox" defaultChecked={Boolean(hour)} />{slot === 0 ? "営業" : "追加枠"}</label><input aria-label={`${day} ${slot + 1}枠目の開始時刻`} name={`start_${dayIndex}_${slot}`} type="time" defaultValue={hour?.startTime ?? (slot === 0 ? "09:00" : "13:00")} /><span>〜</span><input aria-label={`${day} ${slot + 1}枠目の終了時刻`} name={`end_${dayIndex}_${slot}`} type="time" defaultValue={hour?.endTime ?? (slot === 0 ? "18:00" : "18:00")} /></div>; })}</div></div>; })}
        <button className="primary-button" type="submit">営業時間を保存</button></form></section>
        <div className="staff-main"><section className="panel settings-panel"><h2 className="panel-title">例外日を追加</h2><form action={addScheduleException} className="settings-form"><input type="hidden" name="locationId" value={selected!.id} /><label className="settings-field"><span>日付</span><input name="date" type="date" required /></label><label className="settings-field"><span>種別</span><select name="type" defaultValue="CLOSED"><option value="CLOSED">休業</option><option value="SPECIAL_HOURS">臨時営業</option></select></label><div className="time-pair"><label className="settings-field"><span>開始時刻（臨時営業）</span><input name="startTime" type="time" defaultValue="09:00" /></label><label className="settings-field"><span>終了時刻（臨時営業）</span><input name="endTime" type="time" defaultValue="18:00" /></label></div><label className="settings-field"><span>メモ</span><input name="note" maxLength={200} /></label><button className="primary-button" type="submit">例外日を追加</button></form></section>
          <section className="panel settings-panel"><h2 className="panel-title">今後の例外日</h2>{exceptions.length === 0 ? <p className="empty-state">登録はありません。</p> : <div className="exception-list">{exceptions.map((exception) => <div className="invitation-row" key={exception.id}><div><strong>{format(exception.date, "yyyy年M月d日")}・{exception.type === "CLOSED" ? "休業" : `${exception.startTime}〜${exception.endTime}`}</strong>{exception.note && <small>{exception.note}</small>}</div><form action={deleteScheduleException}><input type="hidden" name="id" value={exception.id} /><input type="hidden" name="locationId" value={selected!.id} /><button className="text-button danger" type="submit">削除</button></form></div>)}</div>}</section>
        </div>
      </div>
    </>}
  </main>;
}
