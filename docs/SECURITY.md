# セキュリティ・環境変数管理

## .env の取り扱い

### 現状
- ローカル開発用の `.env` はルートに配置、`.gitignore` で `.env*` として除外済み
- 本番（Vercel）は **Vercel Environment Variables** で別途管理

### ルール
1. `.env` を誤って commit しないこと（.gitignore 設定済みだが注意）
2. 認証情報の共有はチーム内では 1Password / Bitwarden 等の秘密情報管理ツール経由
3. 本番デプロイ時は Vercel Dashboard > Project > Settings > Environment Variables で設定

### 必要な環境変数
- `DATABASE_URL` / `DIRECT_URL` — Supabase接続
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — NextAuth
- `NOTION_API_TOKEN` — Notion API
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Googleログイン
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase管理用
- `CRON_SECRET` — cronエンドポイント認証

### 漏洩した場合の対応
1. Supabaseパスワードを即ローテーション
2. NextAuth secret を再生成し全ユーザーを再ログインさせる
3. 関連するAPIキー（Google、Notion）を取り直す
4. git履歴に漏洩がないか `git log --all -p | grep -i 'secret\|password'` で確認

## 認証・認可

### middleware.ts で実装済み
- IPベースのレート制限: 60リクエスト/分
- API全体の認証チェック（next-auth token）
- CSRF対策（Origin検証）
- ロールベースアクセス制御（/usersはmaster_admin/adminのみ）

### 例外
- `/api/auth/*` は認証なしで通す（NextAuthの認証フロー自体）
- cronエンドポイントは `Bearer ${CRON_SECRET}` で認証

## 追加推奨（将来）
- Sentryによるエラートラッキング（既に設定済み）
- Dependabot等による依存ライブラリ自動更新
- Vercel DeploymentProtection（プレビュー環境の認証保護）
