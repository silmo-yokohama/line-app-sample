import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateSignature, messagingApi, WebhookEvent } from "@line/bot-sdk";

const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
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

  const signature = req.headers["x-line-signature"] as string;
  if (!signature) {
    return res.status(400).json({ error: "Missing signature" });
  }

  const body = JSON.stringify(req.body);
  if (!validateSignature(body, channelSecret, signature)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const events: WebhookEvent[] = req.body.events;

  for (const event of events) {
    if (event.type === "follow") {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "こんにちは！\nチャットフォームをお試しいただきありがとうございます。\n画面下部のメニューからフォームを開いてみてください。",
          },
        ],
      });
    }
  }

  return res.status(200).json({ status: "ok" });
}
