import type { VercelRequest, VercelResponse } from "@vercel/node";
import { messagingApi } from "@line/bot-sdk";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  try {
    await client.pushMessage({
      to: userId,
      messages: [{ type: "text", text: message }],
    });
    return res.status(200).json({ status: "ok" });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: errorMessage });
  }
}
