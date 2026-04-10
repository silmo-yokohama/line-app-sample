import { useState } from "react";
import type { CompletionConfig, Answer, Question } from "../types";

type CompletionScreenProps = {
  completionConfig: CompletionConfig;
  answers: Answer[];
  questions: Question[];
  onSendMessage: () => Promise<void>;
  onClose: () => void;
};

export function CompletionScreen({
  completionConfig,
  answers,
  questions,
  onSendMessage,
  onClose,
}: CompletionScreenProps) {
  const [sendState, setSendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const handleSend = async () => {
    setSendState("sending");
    try {
      await onSendMessage();
      setSendState("sent");
    } catch {
      setSendState("error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto chat-messages px-4 py-6">
      {/* Celebration header */}
      <div className="text-center mb-8 animate-confetti-pop opacity-0">
        <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-300 to-pink-500 items-center justify-center mb-4 shadow-[0_8px_24px_rgba(255,107,157,0.35)]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[17px] font-bold text-text leading-relaxed whitespace-pre-wrap">
          {completionConfig.message}
        </p>
      </div>

      {/* Answer summary */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-text-sub uppercase tracking-widest mb-3 px-1">
          回答サマリー
        </h3>
        <div className="flex flex-col gap-2.5">
          {answers.map((answer, i) => {
            const question = questions.find((q) => q.id === answer.questionId);
            if (!question) return null;

            const labels = answer.values
              .map(
                (v) => question.options.find((o) => o.value === v)?.label ?? v
              )
              .join("、");

            return (
              <div
                key={answer.questionId}
                className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(255,181,197,0.15)] animate-float-in opacity-0"
                style={{
                  animationDelay: `${200 + i * 80}ms`,
                  animationFillMode: "forwards",
                }}
              >
                <p className="text-[11px] font-bold text-pink-400 mb-1">
                  Q{i + 1}
                </p>
                <p className="text-[13px] text-text-sub leading-snug mb-1.5">
                  {question.text}
                </p>
                <p className="text-[14px] font-semibold text-text">
                  {labels}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="flex flex-col gap-3 pb-[max(env(safe-area-inset-bottom),16px)] animate-float-in opacity-0"
        style={{ animationDelay: `${300 + answers.length * 80}ms`, animationFillMode: "forwards" }}
      >
        {sendState === "sent" ? (
          <div className="text-center py-4">
            <p className="text-[15px] font-bold text-pink-500">
              送信しました！
            </p>
          </div>
        ) : sendState === "error" ? (
          <>
            <div className="text-center py-3">
              <p className="text-[13px] text-text-sub">
                LINE アプリ内から開いてください
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full min-h-[52px] rounded-2xl text-[15px] font-bold border-2 border-pink-200 text-pink-500 bg-white active:scale-[0.97] transition-transform duration-200"
            >
              閉じる
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSend}
              disabled={sendState === "sending"}
              className={`
                w-full min-h-[52px] rounded-2xl text-[16px] font-bold tracking-tight
                transition-all duration-300 ease-out active:scale-[0.97]
                ${
                  sendState === "sending"
                    ? "bg-pink-200 text-pink-400 cursor-wait"
                    : "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-[0_4px_16px_rgba(255,107,157,0.4)]"
                }
              `}
            >
              {sendState === "sending" ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full inline-block"
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                  送信中...
                </span>
              ) : (
                "LINE に送信"
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full min-h-[48px] rounded-2xl text-[15px] font-bold text-pink-400 bg-pink-50 border-2 border-pink-100 active:scale-[0.97] transition-transform duration-200"
            >
              閉じる
            </button>
          </>
        )}
      </div>
    </div>
  );
}
