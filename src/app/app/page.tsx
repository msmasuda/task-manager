import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

const stats = [
  {
    label: "本日の予約",
    value: "12",
    note: "昨日より2件多い",
    icon: CalendarClock,
  },
  {
    label: "対応待ち",
    value: "3",
    note: "次の対応 10:30",
    icon: Clock3,
  },
  {
    label: "本日の担当者",
    value: "6",
    note: "1名が休暇",
    icon: UsersRound,
  },
  {
    label: "完了",
    value: "4",
    note: "進捗 33%",
    icon: CheckCircle2,
  },
];

const appointments = [
  {
    time: "10:00",
    duration: "60分",
    name: "佐藤 さくら",
    service: "初回カウンセリング",
    staff: "山田",
    status: "対応中",
    statusClass: "progress",
  },
  {
    time: "11:30",
    duration: "45分",
    name: "田中 直樹",
    service: "定期メンテナンス",
    staff: "鈴木",
    status: "予約確定",
    statusClass: "confirmed",
  },
  {
    time: "13:00",
    duration: "30分",
    name: "高橋 結衣",
    service: "フォローアップ",
    staff: "未割当",
    status: "要確認",
    statusClass: "pending",
  },
  {
    time: "14:30",
    duration: "60分",
    name: "伊藤 健太",
    service: "初回相談",
    staff: "佐々木",
    status: "予約確定",
    statusClass: "confirmed",
  },
];

export default function DashboardPage() {
  return (
    <main className="content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">2026年7月30日・木曜日</p>
          <h1>おはようございます、山田さん</h1>
          <p className="lead">今日の予約と対応状況を確認しましょう。</p>
        </div>
        <button className="primary-button" type="button">
          <CalendarPlus size={17} aria-hidden="true" />
          予約を登録
        </button>
      </header>

      <section className="stats-grid" aria-label="本日の集計">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <article className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className="stat-icon">
                <Icon size={17} aria-hidden="true" />
              </span>
            </div>
            <div className="stat-value">{value}</div>
            <p className="stat-note">{note}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <header className="panel-header">
            <h2 className="panel-title">このあとの予約</h2>
            <button className="secondary-button" type="button">
              すべて表示
            </button>
          </header>
          <div className="appointment-list">
            {appointments.map((appointment) => (
              <article
                className="appointment-row"
                key={`${appointment.time}-${appointment.name}`}
              >
                <div className="time">
                  {appointment.time}
                  <small>{appointment.duration}</small>
                </div>
                <div>
                  <p className="appointment-name">{appointment.name}</p>
                  <p className="appointment-meta">
                    {appointment.service} ・ 担当 {appointment.staff}
                  </p>
                </div>
                <span className={`status ${appointment.statusClass}`}>
                  {appointment.status}
                </span>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel">
          <header className="panel-header">
            <h2 className="panel-title">確認が必要です</h2>
            <span className="status pending">3件</span>
          </header>
          <div className="attention-list">
            <article className="attention-item">
              <span className="attention-icon">
                <UserRoundCheck size={17} aria-hidden="true" />
              </span>
              <div>
                <p className="attention-title">担当者が未割当</p>
                <p className="attention-detail">
                  13:00 高橋 結衣さん
                  <br />
                  フォローアップ
                </p>
              </div>
            </article>
            <article className="attention-item">
              <span className="attention-icon">
                <AlertTriangle size={17} aria-hidden="true" />
              </span>
              <div>
                <p className="attention-title">予約の承認待ち</p>
                <p className="attention-detail">
                  Webから届いた予約が2件あります
                </p>
              </div>
            </article>
          </div>
        </aside>
      </div>
    </main>
  );
}
