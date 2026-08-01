import Link from "next/link";
import { notFound } from "next/navigation";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { cancelPublicAppointment } from "./actions";

const dateTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" });
const statusLabels = { PENDING: "店舗確認待ち", CONFIRMED: "予約確定", CHECKED_IN: "受付済み", IN_PROGRESS: "対応中", COMPLETED: "完了", CANCELLED: "キャンセル済み", REJECTED: "受付不可", NO_SHOW: "来店なし" } as const;

export default async function AppointmentPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ created?: string; cancelled?: string; changed?: string; error?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  const appointment = await db.appointment.findUnique({ where: { managementTokenHash: hashToken(token) }, include: { location: true, customer: true } });
  if (!appointment) notFound();
  const deadline = new Date(appointment.startAt.getTime() - (appointment.location.cancellationDeadlineMinutes ?? 0) * 60_000);
  const canModify = ["PENDING", "CONFIRMED"].includes(appointment.status) && new Date() < deadline;
  return <main className="booking-shell"><section className="booking-container narrow-booking">
    {query.created && <p className="form-success">予約を受け付けました。</p>}
    {query.cancelled && <p className="form-success">予約をキャンセルしました。</p>}
    {query.changed && <p className="form-success">予約日時を変更しました。</p>}
    {query.error === "deadline" && <p className="form-error">キャンセル受付期限を過ぎています。店舗へ直接お問い合わせください。</p>}
    {query.error === "cancel" && <p className="form-error">この予約はキャンセルできません。</p>}
    <p className="eyebrow">予約内容</p><h1>{appointment.serviceNameSnapshot}</h1>
    <span className={`status ${appointment.status === "PENDING" ? "pending" : "confirmed"}`}>{statusLabels[appointment.status]}</span>
    <dl className="appointment-details"><div><dt>店舗</dt><dd>{appointment.location.name}</dd></div><div><dt>日時</dt><dd>{dateTime.format(appointment.startAt)}〜</dd></div><div><dt>お名前</dt><dd>{appointment.customer.name}</dd></div>{appointment.priceAmountSnapshot != null && <div><dt>料金目安</dt><dd>¥{appointment.priceAmountSnapshot.toLocaleString()}</dd></div>}</dl>
    <p className="section-help">このURLは予約確認・変更に必要です。第三者へ共有しないでください。</p>
    {canModify && <div className="appointment-customer-actions"><Link className="primary-button" href={`/appointment/${token}/change`}>日時を変更</Link><details className="cancel-box"><summary>予約をキャンセルする</summary><form action={cancelPublicAppointment} className="settings-form"><input type="hidden" name="token" value={token} /><label className="settings-field"><span>キャンセル理由（任意）</span><input name="reason" maxLength={200} /></label><button className="secondary-button danger-button" type="submit">キャンセルを確定</button></form></details></div>}
  </section></main>;
}
