import liff from "@line/liff";

export async function initializeLiff(liffId: string): Promise<void> {
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login();
  }
}

export async function getLiffProfile(): Promise<{
  displayName: string;
  pictureUrl?: string;
} | null> {
  try {
    const profile = await liff.getProfile();
    return {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch {
    return null;
  }
}

export async function sendLineMessage(text: string): Promise<boolean> {
  if (!liff.isInClient()) return false;
  await liff.sendMessages([{ type: "text", text }]);
  return true;
}

export function closeLiff(): void {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}

export function isInLiff(): boolean {
  return liff.isInClient();
}
