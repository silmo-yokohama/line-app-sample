export function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 animate-bubble-in opacity-0">
      <div className="flex-shrink-0 w-8 h-8 mr-2 mt-1 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center shadow-[0_2px_6px_rgba(255,107,157,0.25)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      <div className="bg-white rounded-[20px] rounded-tl-[6px] shadow-[0_1px_8px_rgba(255,181,197,0.2)] px-5 py-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-pink-300"
            style={{
              animation: "dot-pulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
