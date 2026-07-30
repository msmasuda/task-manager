import { ArrowRight, CalendarCheck, Check, Clock3 } from "lucide-react";
import Link from "next/link";

const sampleSlots = [
  { time: "10:00", name: "佐藤 さくら", service: "初回相談・60分" },
  { time: "11:30", name: "田中 直樹", service: "定期メンテナンス" },
  { time: "14:00", name: "鈴木 美咲", service: "カウンセリング" },
];

export default function HomePage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="メインナビゲーション">
        <div className="sidebar-brand" style={{ padding: 0 }}>
          <span className="brand-mark">
            <CalendarCheck size={18} aria-hidden="true" />
          </span>
          Reservation Manager
        </div>
        <Link className="secondary-button" href="/app">
          デモを見る
        </Link>
      </nav>

      <section className="landing-hero">
        <div>
          <p className="eyebrow" style={{ color: "#8de0ce" }}>
            予約業務を、もっと見通しよく
          </p>
          <h1>予約も、担当も、今日の動きも。ひとつの場所に。</h1>
          <p className="landing-copy">
            複数店舗の空き枠、スタッフ、設備をまとめて管理。
            Web予約から来店、対応完了までを迷わず進められます。
          </p>
          <Link className="primary-button" href="/app">
            管理画面を確認する
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="hero-card" aria-label="本日の予約のサンプル">
          <div className="hero-card-head">
            <div>
              <p className="eyebrow">TODAY</p>
              <h2 className="panel-title">本日の予約</h2>
            </div>
            <span className="status confirmed">
              <Check size={13} aria-hidden="true" />
              8件確定
            </span>
          </div>
          {sampleSlots.map((slot) => (
            <div className="mini-slot" key={slot.time}>
              <strong>{slot.time}</strong>
              <div>
                <p className="appointment-name">{slot.name}</p>
                <p className="appointment-meta">{slot.service}</p>
              </div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              color: "var(--muted)",
              fontSize: 12,
            }}
          >
            <Clock3 size={14} aria-hidden="true" />
            次の予約まで32分
          </div>
        </div>
      </section>
    </main>
  );
}
