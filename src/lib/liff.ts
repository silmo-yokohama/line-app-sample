import liff from "@line/liff";

export async function initializeLiff(liffId: string): Promise<void> {
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login();
  }
}

export async function getLiffProfile(): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
} | null> {
  try {
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch {
    return null;
  }
}

export async function sendCompletionMessage(
  userId: string,
  message: string
): Promise<void> {
  const res = await fetch("/api/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "送信に失敗しました");
  }
}

export function closeLiff(): void {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}

export function openExternalUrlAndClose(url: string): void {
  if (liff.isInClient()) {
    liff.openWindow({ url, external: true });
    liff.closeWindow();
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function isInLiff(): boolean {
  return liff.isInClient();
}
