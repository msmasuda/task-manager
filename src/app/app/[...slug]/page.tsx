import { Construction } from "lucide-react";
import Link from "next/link";

export default function PlaceholderPage() {
  return (
    <main className="content">
      <div className="panel" style={{ padding: 40, textAlign: "center" }}>
        <Construction
          size={36}
          color="var(--primary)"
          style={{ margin: "0 auto 18px" }}
          aria-hidden="true"
        />
        <h1 style={{ fontSize: 26 }}>この画面は準備中です</h1>
        <p className="lead" style={{ marginBottom: 22 }}>
          基盤の実装後、予約・カレンダー・設定画面を順次追加します。
        </p>
        <Link className="primary-button" href="/app">
          今日の概要へ戻る
        </Link>
      </div>
    </main>
  );
}
