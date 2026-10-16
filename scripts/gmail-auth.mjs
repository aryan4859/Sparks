// One-time setup: lets Sparks send newsletter emails from your Gmail account.
//
//   1. In .env, set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (a "Desktop app" OAuth
//      client from Google Cloud Console, see PROJECT_STATUS.md)
//   2. npm run gmail-auth
//   3. Open the printed link, sign in with the Gmail account and allow "Send email"
//   4. Copy the printed GMAIL_REFRESH_TOKEN line into .env
import { createServer } from "node:http";

const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}`;
const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send", // send only, can't read your mail
    access_type: "offline",
    prompt: "consent",
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", redirectUri);
  const code = url.searchParams.get("code");
  if (!code) {
    res.end(url.searchParams.get("error") ?? "Waiting for Google…");
    return;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = await tokenRes.json();
  if (!json.refresh_token) {
    res.end("Something went wrong, check the terminal.");
    console.error("\nNo refresh token returned:", json);
  } else {
    res.end("Done! You can close this tab and go back to the terminal.");
    console.log("\nAdd this line to .env:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${json.refresh_token}\n`);
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this link, sign in with the Gmail account you'll send from, and allow access:\n");
  console.log(authUrl);
});
