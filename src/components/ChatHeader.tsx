type ChatHeaderProps = {
  title: string;
  currentStep: number;
  totalSteps: number;
  userProfile?: { displayName: string; pictureUrl?: string };
};

export function ChatHeader({
  title,
  currentStep,
  totalSteps,
  userProfile,
}: ChatHeaderProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <header className="relative z-10 flex-shrink-0 px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3 bg-white/80 backdrop-blur-xl border-b border-pink-100/60">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center shadow-[0_2px_8px_rgba(255,107,157,0.3)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-text">
            {title}
          </h1>
        </div>

        {userProfile && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-sub max-w-[80px] truncate">
              {userProfile.displayName}
            </span>
            {userProfile.pictureUrl ? (
              <img
                src={userProfile.pictureUrl}
                alt={userProfile.displayName}
                className="w-8 h-8 rounded-full ring-2 ring-pink-200 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center ring-2 ring-pink-100">
                <span className="text-xs font-bold text-pink-600">
                  {userProfile.displayName.charAt(0)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-pink-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 transition-all duration-700 ease-out"
          style={{ width: `${Math.max(progress, 3)}%` }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              backgroundSize: "200% 100%",
              animation: "progress-shimmer 2s infinite",
            }}
          />
        </div>
        <span className="absolute right-0 -top-5 text-[10px] font-bold text-pink-400 tabular-nums">
          {currentStep}/{totalSteps}
        </span>
      </div>
    </header>
  );
}
