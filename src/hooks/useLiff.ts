import { useState, useEffect } from "react";
import { initializeLiff, getLiffProfile, isInLiff } from "../lib/liff";

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type UseLiffReturn = {
  isReady: boolean;
  isLoggedIn: boolean;
  isInLiff: boolean;
  profile: LiffProfile | null;
  error: string | null;
};

export function useLiff(): UseLiffReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID;
    if (!liffId) {
      setError("LIFF ID が設定されていません");
      setIsReady(true);
      return;
    }

    initializeLiff(liffId)
      .then(async () => {
        setIsLoggedIn(true);
        const p = await getLiffProfile();
        setProfile(p);
        setIsReady(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsReady(true);
      });
  }, []);

  return {
    isReady,
    isLoggedIn,
    isInLiff: isReady ? isInLiff() : false,
    profile,
    error,
  };
}
