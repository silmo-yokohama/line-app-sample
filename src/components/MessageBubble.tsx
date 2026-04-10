import type { ChatMessage } from "../types";

type MessageBubbleProps = {
  message: ChatMessage;
  animate?: boolean;
};

export function MessageBubble({ message, animate = false }: MessageBubbleProps) {
  const isBot = message.role === "bot";

  return (
    <div
      className={`flex ${isBot ? "justify-start" : "justify-end"} px-4 ${
        animate ? "animate-bubble-in opacity-0" : ""
      }`}
    >
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 mr-2 mt-1 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center shadow-[0_2px_6px_rgba(255,107,157,0.25)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      )}

      <div
        className={`
          relative max-w-[75%] px-4 py-3 text-[15px] leading-relaxed
          ${
            isBot
              ? "bg-white rounded-[20px] rounded-tl-[6px] shadow-[0_1px_8px_rgba(255,181,197,0.2)] text-text"
              : "bg-gradient-to-br from-pink-200 to-bubble-user rounded-[20px] rounded-tr-[6px] text-text"
          }
        `}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}
