// Google OAuth2 リフレッシュトークン取得スクリプト
// 実行: node scripts/get-google-token.js
// ブラウザで認証後、表示されたリフレッシュトークンを.envのGOOGLE_REFRESH_TOKENに設定

const http = require("http")
const { execSync } = require("child_process")
require("dotenv").config()

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = "http://localhost:3333/callback"
const SCOPES = "https://www.googleapis.com/auth/calendar"

// Step 1: 認証URLを開く
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`

console.log("\n🔑 Google OAuth2 認証")
console.log("ブラウザが開きます。Googleアカウントでログインしてください。\n")

// macOSでブラウザを開く
execSync(`open "${authUrl}"`)

// Step 2: コールバックサーバー
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) return

  const url = new URL(req.url, "http://localhost:3333")
  const code = url.searchParams.get("code")

  if (!code) {
    res.end("エラー: 認証コードが取得できませんでした")
    server.close()
    return
  }

  // Step 3: コードをトークンに交換
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })
    const data = await tokenRes.json()

    if (data.refresh_token) {
      console.log("\n✅ 取得成功！")
      console.log("\n以下を .env の GOOGLE_REFRESH_TOKEN に設定してください:\n")
      console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}`)
      console.log("")
      res.end("✅ トークン取得成功！ターミナルを確認してください。このタブは閉じてOKです。")
    } else {
      console.log("\n❌ リフレッシュトークンが返されませんでした")
      console.log("レスポンス:", JSON.stringify(data, null, 2))
      res.end("❌ エラー: リフレッシュトークンが返されませんでした。ターミナルを確認してください。")
    }
  } catch (e) {
    console.error("トークン交換エラー:", e)
    res.end("❌ エラーが発生しました")
  }

  server.close()
})

server.listen(3333, () => {
  console.log("コールバックサーバー起動: http://localhost:3333")
  console.log("ブラウザで認証を完了してください...")
})
