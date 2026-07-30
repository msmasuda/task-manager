# 予約・アサイン管理システム設計書

## 1. 目的

時間枠を使ってサービスを提供する企業・店舗が、次の業務を一元管理できるWebアプリを提供する。

- Web、電話、店頭から入る予約の受付
- スタッフ、設備、部屋などの空き状況管理
- 予約への対応者アサイン
- 来店前から完了までの対応状況管理
- 顧客情報と予約履歴の管理

美容室、クリニック、自動車整備、法律・会計相談など、異なる業種で共通利用できる汎用モデルを採用する。

## 2. 基本方針

- 1つの企業（Organization）が複数店舗（Location）を管理する
- データは企業単位で厳格に分離するマルチテナント構成とする
- スタッフは複数店舗に所属できる
- 予約は店舗、サービス、顧客、時間枠を必須とする
- 対応スタッフと設備・部屋などのリソースは必要に応じて割り当てる
- 公開予約とスタッフによる代理予約を同じ予約モデルで扱う
- カレンダーは時間管理、カンバンは対応状況管理に使い分ける
- 業種固有の機微情報はMVPで扱わない

## 3. 用語

| 用語 | 意味 |
|---|---|
| Organization | 契約主体となる企業・事業者 |
| Location | 店舗、院、営業所、事務所 |
| Staff | 管理画面を利用する従業員・担当者 |
| Customer | 予約する顧客。管理画面アカウントとは分離 |
| Service | カット、診察、車検、法律相談などの予約メニュー |
| Resource | 席、診察室、機器、作業ベイなどの共有設備 |
| Appointment | 予約 |
| Assignment | 予約へのスタッフ割り当て |
| Availability | 営業時間、勤務時間、休業・例外時間から算出した対応可能枠 |

## 4. MVPの範囲

### 4.1 対象

- 企業登録と初期管理者の作成
- 複数店舗の作成・設定
- スタッフ招待、複数店舗への所属、権限設定
- 店舗ごとの営業時間、休業日、臨時営業
- スタッフごとの勤務時間、休暇、対応可能サービス
- サービス名、所要時間、準備・片付け時間、料金目安
- サービス提供に必要なリソース種別と設備
- 公開予約ページ
- スタッフによる電話・店頭予約の代理登録
- 空き枠検索
- 担当者指名、手動アサイン、自動アサイン
- 予約変更、キャンセル
- 日・週カレンダー
- 対応状況カンバン
- 顧客台帳、予約履歴、業務上必要な短いメモ
- 予約確認、変更、キャンセルメール
- 操作履歴
- PC、タブレット、スマートフォン対応

### 4.2 対象外

- オンライン決済、返金
- SMS、LINE通知
- Google / Outlookカレンダー連携
- 回数券、会員ランク、ポイント
- キャンセル料の自動徴収
- 電子カルテ、診断、処方、検査結果
- 法律・会計相談の案件記録や文書保管
- 車両の詳細な整備記録・部品在庫
- 画像・ファイル添付
- 顧客用ログインアカウント
- リアルタイム共同編集
- 複数人・グループ予約
- 複数サービスを連続して取る予約

顧客はMVPではアカウントを作成せず、予約ごとの安全なURLから確認・変更・キャンセルを行う。

## 5. テナントと組織構造

```text
Organization
├── OrganizationMember ── User
├── Location
│   ├── LocationMember ── User
│   ├── Service
│   ├── Resource
│   ├── BusinessHours / Closure
│   └── Appointment
├── Customer
└── AuditLog
```

### テナント分離

- テナント境界は `organizationId`
- テナントデータを持つ全テーブルへ `organizationId` を保持する
- 読み書きの全クエリで、セッションから確定した `organizationId` を条件に含める
- URLやフォームから受け取った `organizationId` を認可根拠にしない
- Location、Service、Staff、Customerなどの関連先が同じOrganizationに属することを更新時に検証する
- 将来はPostgreSQL Row Level Securityを追加できる構造にするが、MVPではアプリケーション層の認可を必須とする

## 6. 権限

### 6.1 組織ロール

| 操作 | OWNER | ADMIN | STAFF |
|---|---:|---:|---:|
| 組織設定 | 可 | 一部可 | 不可 |
| 店舗作成・削除 | 可 | 可 | 不可 |
| スタッフ招待・権限管理 | 可 | 可 | 不可 |
| サービス・設備管理 | 可 | 可 | 不可 |
| 全店舗の予約・顧客閲覧 | 可 | 可 | 所属店舗のみ |
| 所属店舗の予約操作 | 可 | 可 | 可 |
| 操作履歴閲覧 | 可 | 可 | 不可 |
| 契約・組織削除 | 可 | 不可 | 不可 |

### 6.2 店舗所属

- STAFFはLocationMemberに登録された店舗だけを利用できる
- OWNER / ADMINにも店舗絞り込みを提供するが、組織ロール上は全店舗へアクセス可能
- スタッフごとに「予約編集」「顧客情報閲覧」などの細粒度権限を将来追加できる構造にする
- Organizationには常に1人以上のOWNERを必要とする

### 6.3 顧客

- 顧客はスタッフ用認証を利用しない
- 予約確認URLには予約単位のランダムなトークンを使用する
- URLから閲覧できる情報は当該予約の必要最小限に限定する

## 7. 予約ステータス

### 7.1 予約状態

```text
PENDING
  ├── CONFIRMED
  │     ├── CHECKED_IN
  │     │      ├── IN_PROGRESS
  │     │      │      └── COMPLETED
  │     │      └── NO_SHOW
  │     ├── COMPLETED
  │     └── NO_SHOW
  ├── CANCELLED
  └── REJECTED
```

| 状態 | 用途 |
|---|---|
| PENDING | 店舗確認またはアサイン待ち |
| CONFIRMED | 予約確定 |
| CHECKED_IN | 来店・受付済み |
| IN_PROGRESS | 対応中 |
| COMPLETED | 対応完了 |
| CANCELLED | 顧客または店舗によるキャンセル |
| REJECTED | 店舗が予約を受けられない |
| NO_SHOW | 無断キャンセル・来店なし |

店舗は、公開予約を即時にCONFIRMEDとするか、PENDINGで受けてスタッフが確認するか選択できる。担当者未確定でも予約自体はCONFIRMEDにできる設定を持つ。

### 7.2 アサイン状態

予約ステータスとは別に計算する。

- UNASSIGNED: 必要人数に満たない
- ASSIGNED: 必要人数を満たす
- CONFLICTED: 勤務外や重複など、現在の割り当てに矛盾がある

## 8. 画面・URL設計

### 8.1 公開画面

- `/book/[organizationSlug]`: 店舗選択
- `/book/[organizationSlug]/[locationSlug]`: サービス・日時・担当者選択
- `/book/[organizationSlug]/[locationSlug]/details`: 顧客情報入力
- `/book/[organizationSlug]/[locationSlug]/complete`: 予約受付完了
- `/appointment/[token]`: 予約確認・変更・キャンセル
- `/login`: スタッフログイン
- `/signup`: 初期企業・OWNER登録
- `/verify-email/[token]`: メールアドレス確認
- `/forgot-password`
- `/reset-password/[token]`
- `/invite/[token]`: スタッフ招待承認

### 8.2 管理画面

- `/app`: 今日の概要
- `/app/calendar`: 日・週カレンダー
- `/app/appointments`: 予約一覧
- `/app/board`: 対応状況カンバン
- `/app/customers`: 顧客一覧
- `/app/customers/[customerId]`: 顧客詳細・予約履歴
- `/app/settings/organization`: 企業設定
- `/app/settings/locations`: 店舗設定
- `/app/settings/services`: サービス設定
- `/app/settings/staff`: スタッフ・勤務・対応サービス
- `/app/settings/resources`: 設備・部屋
- `/app/settings/booking`: 公開予約・キャンセルポリシー
- `/app/settings/audit-logs`: 操作履歴
- `/app/account`: 個人設定・パスワード

### 8.3 店舗切り替え

- ヘッダーで対象店舗を切り替える
- OWNER / ADMINは全店舗集計または単一店舗を選択できる
- 予約作成・編集時は対象店舗を明示する
- STAFFは所属店舗だけが選択肢に表示される

## 9. 公開予約フロー

1. 顧客が店舗を選択
2. サービスを選択
3. 指名なし、または対応可能なスタッフを選択
4. 店舗営業時間、スタッフ勤務、既存予約、必要設備を考慮した空き枠を表示
5. 日時を選択
6. 氏名、メールアドレス、電話番号、任意メモ、同意項目を入力
7. サーバーで空き枠を再検証
8. DBトランザクションで予約、顧客、アサイン、リソース確保を保存
9. 予約管理トークンを発行し、確認メールを送信
10. 店舗設定に応じてPENDINGまたはCONFIRMEDにする

空き枠表示から確定までに他の予約が入る可能性があるため、確定時の再検証とDB制約を必須とする。

## 10. スタッフによる予約フロー

1. 店舗、サービス、日時を選択
2. 既存顧客を検索、または新規作成
3. 希望担当者、または「自動・後で割り当て」を選択
4. 必要なリソースを自動または手動選択
5. 重複、勤務時間、設備不足を検証
6. 予約を保存
7. 顧客へメールを送るか選択

管理者だけが警告付きで時間外予約を作成できる。二重予約の強制登録はMVPでは許可しない。

## 11. アサイン

### 11.1 担当者指名

- ServiceStaffで対応可能と設定されたスタッフだけを表示
- 公開予約ページへのスタッフ表示可否を個別設定
- 指名予約ではそのスタッフの勤務・既存予約を使って空き枠を計算

### 11.2 手動アサイン

- 予約詳細またはカンバンから対応可能スタッフを選択
- 同時刻の予約、勤務時間、休暇、対応可能サービスを検証
- 変更時は必要に応じて顧客への通知を選択

### 11.3 自動アサイン

MVPでは決定的で説明可能なルールを採用する。

1. 対象店舗に勤務中
2. 対象Serviceに対応可能
3. 予約時間と準備・片付け時間に重複がない
4. 同時間帯の担当件数が上限未満
5. 希望スタッフが指定されていれば優先
6. 当日の割当時間が少ない順
7. 同率ならStaff IDで安定ソート

候補がいなければ予約をUNASSIGNEDのまま保存し、管理画面へ警告表示する。割当理由と候補不在理由をActivityへ残す。

## 12. 空き枠計算

### 12.1 入力

- 店舗タイムゾーン
- 店舗営業時間・休業・臨時営業時間
- 予約受付可能期間
- 予約間隔（例: 15分）
- Serviceの所要時間、準備時間、片付け時間
- Serviceに対応可能なスタッフ
- スタッフの勤務時間、休暇、既存Assignment
- 必要Resourceの営業時間、停止時間、既存Reservation
- 予約締切時間

### 12.2 計算

```text
候補枠
= 店舗の営業枠
∩ 対応可能スタッフが1名以上空いている枠
∩ 必要リソースが空いている枠
- 既存予約とブロック時間
```

- DBはUTCで保存し、計算・表示時にLocation.timeZoneを使用
- 日をまたぐ営業時間をサポート
- 所要時間だけでなく前後バッファーを占有時間に含める
- 指名なしの場合は最低1人の候補スタッフを確保できる枠を返す
- リソース種別ごとに必要数を満たす枠だけを返す
- 空き枠APIは表示用であり、確保を保証しない

### 12.3 同時予約対策

PostgreSQLの時間範囲と排他制約を利用する。

- Assignmentごとにスタッフ占有時間を `tstzrange` 相当で管理
- ResourceReservationごとにリソース占有時間を管理
- スタッフ・リソース単位の重複をDB制約で拒否
- 予約確定処理はSerializable相当の再試行可能なトランザクション、または対象行ロックを使用
- 競合時は「その枠は埋まりました」と返し、代替枠を再取得する

Prisma migrationで表現できない排他制約は、SQLを追加したmigrationとして管理する。

## 13. データモデル

すべてのIDは `cuid()`、日時はUTCで保存する。テナントデータには `organizationId` を持たせる。

### 13.1 認証・組織

#### User

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| name | String |
| email | String, unique、正規化済み |
| passwordHash | String |
| emailVerifiedAt | DateTime? |
| createdAt / updatedAt | DateTime |

#### Session

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| sessionToken | String, unique |
| userId | String, FK |
| expires | DateTime |

#### Organization

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| name | String |
| slug | String, unique |
| defaultTimeZone | String |
| createdAt / updatedAt | DateTime |

#### OrganizationMember

| フィールド | 型・制約 |
|---|---|
| organizationId | String, FK |
| userId | String, FK |
| role | OrganizationRole: OWNER / ADMIN / STAFF |
| isActive | Boolean |
| createdAt / updatedAt | DateTime |

複合主キーは `(organizationId, userId)`。

#### OrganizationInvitation

企業、招待先メール、ロール、招待者、tokenHash、有効期限、承認日時、失効日時を保持する。生トークンは保存しない。

### 13.2 店舗・営業時間

#### Location

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| organizationId | String, FK |
| name | String |
| slug | String |
| timeZone | String（IANA形式） |
| email / phone | String? |
| postalCode / address | String? |
| bookingEnabled | Boolean |
| bookingMode | BookingMode: AUTO_CONFIRM / MANUAL_CONFIRM |
| slotIntervalMinutes | Int |
| minLeadTimeMinutes | Int |
| maxAdvanceDays | Int |
| cancellationDeadlineMinutes | Int? |
| createdAt / updatedAt | DateTime |

`(organizationId, slug)` をuniqueとする。

#### LocationMember

`(locationId, userId)` を複合主キーとし、スタッフの店舗所属、表示順、公開予約への表示可否を保持する。

#### BusinessHours

店舗、曜日、開始ローカル時刻、終了ローカル時刻を保持する。同じ曜日に複数枠を許可し、昼休みや夜間営業を表現する。

#### LocationScheduleException

特定日の休業または臨時営業時間を保持する。

#### StaffSchedule / StaffTimeOff

- StaffSchedule: 店舗、スタッフ、曜日、勤務開始・終了
- StaffTimeOff: UTCの開始・終了、理由種別

### 13.3 サービス・スタッフ・設備

#### Service

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| organizationId | String, FK |
| locationId | String, FK |
| name | String |
| description | String? |
| durationMinutes | Int |
| bufferBeforeMinutes | Int |
| bufferAfterMinutes | Int |
| priceAmount | Int?（最小通貨単位） |
| currency | String |
| requiredStaffCount | Int、MVPでは1 |
| color | String |
| isPublic | Boolean |
| isActive | Boolean |
| createdAt / updatedAt | DateTime |

MVPではServiceは店舗単位とする。複数店舗への一括複製機能を提供し、将来は組織共通テンプレートを追加する。

#### ServiceStaff

`(serviceId, userId)` を複合主キーとし、そのスタッフが対応可能か、公開指名可能かを保持する。

#### ResourceType

「スタイリング席」「診察室」「リフト」「会議室」など。ServiceResourceRequirementで必要数を指定する。

#### Resource

特定店舗に属する設備の実体。名称、ResourceType、有効状態を保持する。

#### ServiceResourceRequirement

`(serviceId, resourceTypeId)` を複合主キーとし、必要数を保持する。

### 13.4 顧客

#### Customer

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| organizationId | String, FK |
| name | String |
| nameKana | String? |
| email | String?、正規化済み |
| phone | String?、正規化済み |
| note | String? |
| marketingConsentAt | DateTime? |
| createdAt / updatedAt | DateTime |

- 顧客はOrganization内で共有し、店舗をまたぐ予約履歴を持てる
- メールまたは電話番号で重複候補を表示する
- 自動マージはせず、スタッフが確認して統合する
- noteへ医療情報、相談内容、決済情報などを保存しない旨をUIに表示する

### 13.5 予約

#### Appointment

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| organizationId | String, FK |
| locationId | String, FK |
| serviceId | String, FK |
| customerId | String, FK |
| status | AppointmentStatus |
| source | AppointmentSource: WEB / PHONE / WALK_IN / STAFF |
| startAt / endAt | DateTime |
| occupancyStartAt / occupancyEndAt | DateTime |
| preferredStaffId | String? |
| customerNote | String? |
| internalNote | String? |
| managementTokenHash | String, unique |
| cancellationReason | String? |
| cancelledAt | DateTime? |
| createdById | String?, FK User |
| version | Int |
| createdAt / updatedAt | DateTime |

- `endAt` は顧客へ案内する終了予定
- `occupancyStartAt / occupancyEndAt` は前後バッファーを含む占有時間
- `version` は楽観ロック用
- Service名、所要時間、料金は予約時点のスナップショットも保持し、後のService変更で過去予約を変えない

#### AppointmentAssignment

予約、スタッフ、担当種別、占有開始・終了、割当者、割当日時を保持する。MVPは原則1予約1担当者だが、将来の複数担当に対応できる中間テーブルとする。

#### ResourceReservation

予約、Resource、占有開始・終了を保持する。スタッフ割当と同じく、重複をDB制約で禁止する。

#### AppointmentStatusHistory

予約、変更前後のステータス、変更者、変更日時を保持する。カンバン操作と顧客通知の監査に使用する。

### 13.6 トークン・監査

#### EmailVerificationToken / PasswordResetToken

userId、tokenHash、有効期限、使用日時を保持する。有効期限はメール確認24時間、パスワード再設定1時間を初期値とする。

#### AuditLog

| フィールド | 型・制約 |
|---|---|
| id | String, PK |
| organizationId | String, FK |
| actorId | String?, FK User |
| action | AuditAction |
| entityType | AuditEntityType |
| entityId | String |
| locationId | String? |
| metadata | Json? |
| createdAt | DateTime |

ログイン、予約作成・変更・キャンセル、アサイン、顧客情報閲覧・更新、設定・権限変更を記録する。パスワード、認証トークン、顧客メモ本文は記録しない。

## 14. カレンダーとカンバン

### 14.1 カレンダー

- 日表示: スタッフまたは設備ごとの列
- 週表示: 店舗全体またはスタッフ単位
- 店舗、スタッフ、サービス、ステータスで絞り込み
- 予約のドラッグによる時刻・担当変更
- ドラッグ確定時に空き状況とversionを再検証
- 競合時は元の位置へ戻し、理由を表示

### 14.2 カンバン

初期列:

- 受付待ち（PENDING）
- 予約確定（CONFIRMED）
- 来店済み（CHECKED_IN）
- 対応中（IN_PROGRESS）
- 完了（COMPLETED）

CANCELLED、REJECTED、NO_SHOWは別フィルターで表示する。未アサインは専用フィルター・警告バッジを設ける。

カードには顧客名、開始時刻、サービス、担当者、指名、アサイン警告を表示する。列移動は許可されたステータス遷移だけを受け付ける。

## 15. アプリケーション構成

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/app/
│   ├── book/
│   ├── appointment/
│   └── api/
├── components/
│   ├── ui/
│   ├── calendar/
│   ├── board/
│   └── booking/
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── locations/
│   ├── staff/
│   ├── services/
│   ├── availability/
│   ├── appointments/
│   ├── customers/
│   └── audit-logs/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── email/
│   ├── permissions/
│   ├── tenancy/
│   └── validation/
└── types/
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
tests/
├── unit/
├── integration/
└── e2e/
```

設計原則:

- 読み取りはServer Componentから機能別サービス層を呼ぶ
- 書き込みはServer Actionsを基本とする
- 公開空き枠取得、Webhook、ヘルスチェックはRoute Handlerを使う
- Server Actionを公開APIと同様に扱い、毎回認証・テナント・権限・入力を検証する
- PrismaをUIから直接呼ばない
- 空き枠計算を純粋なドメインロジックとDBクエリに分離してテストする

## 16. 認証・セキュリティ

### スタッフ認証

- Auth.js Credentials Providerとデータベースセッション
- メールアドレス確認を必須とする
- パスワードは12文字以上、Argon2idでハッシュ化
- Cookieは `HttpOnly`、`Secure`（本番）、`SameSite=Lax`
- パスワード再設定後に既存セッションをすべて失効
- 認証、招待、予約管理トークンは32バイト以上の暗号学的乱数
- DBにはトークンのハッシュだけを保存

### 防御

- Zodによるサーバー側入力検証
- ログイン、メール再送、公開空き枠、予約作成へのレート制限
- 公開フォームへbot対策を追加できるインターフェース
- CSRF、XSS、SQL Injection対策
- CSP、HSTS、Referrer-Policyなどのセキュリティヘッダー
- エラー応答からアカウント・顧客の存在を推測させない
- 顧客情報を含むページはキャッシュしない
- ログへ顧客情報、Cookie、トークン、メール本文を出さない

レート制限はVercel MarketplaceのUpstash Redisを推奨する。初期コストを抑える場合でも、公開予約作成と認証には永続的な制限機構を設ける。

## 17. 個人情報と業種固有情報

本システムは氏名、連絡先、予約履歴を扱うため、個人情報保護を前提とする。

- 目的に必要な情報だけを収集
- 公開予約画面にプライバシーポリシーと同意を表示
- Organization間でCustomerを共有しない
- スタッフの顧客情報閲覧を所属・権限で制限
- 顧客情報の閲覧・出力・変更をAuditLogへ記録
- 保存期間と削除依頼への運用手順を本番前に決定
- DBバックアップも本番データと同じ保護対象とする
- メールには最小限の予約情報だけを記載

医療・法律・会計などのセンシティブな内容はMVPの対象外とし、次を保存しない。

- 病歴、症状、診断、処方、検査結果
- 法律相談・会計相談の具体的内容や資料
- クレジットカード情報
- 本人確認書類

これらを将来扱う場合は、法令・業界要件、暗号化、アクセス制御、監査、保存期間を別途設計する。

## 18. メール

Resendで次を送信する。

- スタッフのメール確認
- スタッフ招待
- パスワード再設定
- 予約受付・予約確定
- 予約変更
- 予約キャンセル

要件:

- メール送信失敗で予約トランザクションをロールバックしない
- 送信要求をEmailDeliveryテーブルへ記録し、再試行可能にする
- 宛先、テンプレート種別、状態、試行回数、最終エラー概要を保持
- 秘密情報や生トークンをログへ残さない
- 同じイベントの二重送信をidempotency keyで防ぐ

MVPではVercel Functionsから同期的に送信要求を行い、失敗分を管理画面または定期処理で再送する。

## 19. 環境変数

```text
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
APP_URL=
RESEND_API_KEY=
EMAIL_FROM=
TOKEN_HASH_SECRET=
RATE_LIMIT_REDIS_URL=
RATE_LIMIT_REDIS_TOKEN=
```

- `DATABASE_URL`: アプリ実行用プール接続
- `DIRECT_URL`: migration用直接接続
- PreviewとProductionのDBを分離する
- 秘密値はGitへ登録せず、Vercel環境ごとに設定
- Previewから実顧客へメールを送信しない

## 20. インフラ・デプロイ

```text
Customer / Staff Browser
          │ HTTPS
          ▼
   Vercel / Next.js
      ├── Prisma Postgres
      ├── Resend
      └── Upstash Redis
```

- PostgreSQLはVercel Marketplace経由のPrisma Postgres
- FunctionsとDBは利用地域に近いリージョンへ配置
- アプリ通信はプール接続、Prisma Migrateは直接接続
- `postinstall` で `prisma generate`
- migrationはCIまたは明示的リリース工程で `prisma migrate deploy`
- Preview環境ごとに隔離DBまたは安全な検証DBを使用
- Production反映前にバックアップとmigrationロールフォワード手順を確認

## 21. テスト

### 単体テスト

- 営業時間・例外・勤務時間の合成
- タイムゾーン、日跨ぎ、夏時間
- 所要時間と前後バッファー
- 自動アサイン候補と優先順位
- ステータス遷移
- 権限とテナント境界
- トークン生成・検証

### 結合テスト

- 同じOrganization内の関連整合性
- 別OrganizationのIDを指定した読み書きの拒否
- スタッフ・Resourceの二重予約防止
- 同時予約競合
- 予約作成、変更、キャンセル
- 公開予約、手動予約、自動アサイン
- 招待、メール確認、パスワード再設定
- AuditLogとEmailDelivery

### E2E

- 企業登録から店舗・サービス公開
- 顧客による予約と確認メール
- 電話予約の登録
- 担当者指名
- 未アサイン予約への手動・自動アサイン
- カレンダーでの予約移動
- カンバンでの受付から完了
- 顧客自身による変更・キャンセル
- OWNER / ADMIN / STAFFの権限差
- モバイル公開予約

## 22. 非機能要件

- 店舗タイムゾーンを基準に正しい日時を表示
- 主要画面は幅375px以上をサポート
- WCAG 2.2 AAを目標とする
- 通常の空き枠検索は2秒以内を目標
- 予約確定操作は3秒以内を目標（メール完了待ちは除く）
- カレンダーは表示期間と店舗で範囲を限定して取得
- 顧客一覧はページネーションを必須とする
- DB索引はorganizationId、locationId、startAt、statusを中心に設計
- 本番エラー監視と構造化ログを導入
- 日次バックアップと復元テストの運用を本番前に確定

## 23. 受け入れ条件

- 企業Aのユーザーが企業Bの予約・顧客・設定へアクセスできない
- STAFFは所属外店舗へアクセスできない
- 顧客が公開ページで空き枠を選び、予約を完了できる
- スタッフが電話・店頭予約を登録できる
- 店舗営業時間、スタッフ勤務、休暇、既存予約、必要設備が空き枠へ反映される
- 同じスタッフまたは設備へ重複予約を確定できない
- 指名、手動、自動の各方式で担当者を割り当てられる
- 候補がいない予約は未アサインとして明確に表示される
- 予約をカレンダーとカンバンで管理できる
- 不正なステータス遷移をサーバーが拒否する
- 顧客が安全なURLから予約確認・変更・キャンセルできる
- 予約・アサイン・顧客・権限の主要操作が監査ログに残る
- lint、型チェック、単体・結合・E2Eテスト、Production buildが成功する

## 24. 実装フェーズ

### Phase 1: 基盤

- Next.js、TypeScript、Tailwind CSS
- lint、formatter、テスト
- Prisma schema、PostgreSQL、初回migration
- テナントコンテキスト、共通エラー、ログ

### Phase 2: 認証・組織

- スタッフ登録、メール確認、ログイン、再設定
- Organization、Location、招待、権限
- テナント分離の結合テスト

### Phase 3: 予約設定

- Service、ServiceStaff
- BusinessHours、例外、勤務、休暇
- Resource、ServiceResourceRequirement

### Phase 4: 予約エンジン

- 空き枠計算
- Customer、Appointment
- 重複防止制約
- スタッフによる予約登録・変更・キャンセル

### Phase 5: 公開予約

- 公開予約画面
- 予約管理URL
- Resend、EmailDelivery、レート制限

### Phase 6: 運用画面

- カレンダー
- カンバン
- 手動・自動アサイン
- 顧客台帳、監査ログ

### Phase 7: 本番準備

- アクセシビリティ、レスポンシブ
- セキュリティレビュー
- E2E、負荷・競合テスト
- Vercel Preview / Production、監視、バックアップ

## 25. 本番前に決定する運用項目

- サービス名、ロゴ、ドメイン
- 最初に提供する国・言語・通貨
- 企業のセルフ登録可否
- 店舗ごとの予約変更・キャンセル期限
- 顧客データの保存・削除・エクスポート方針
- プライバシーポリシー、利用規約
- Resendの送信元ドメイン
- Vercel / DBのリージョン
- Preview環境のメール制限
- バックアップ保持期間と復元責任者
- 障害時の予約受付停止・代替運用
