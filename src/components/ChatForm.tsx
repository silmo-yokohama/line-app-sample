import { useRef, useEffect } from "react";
import type {
  ChatMessage,
  Question,
  CompletionConfig,
  Answer,
  Option,
} from "../types";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { OptionButtons } from "./OptionButtons";
import { TypingIndicator } from "./TypingIndicator";
import { CompletionScreen } from "./CompletionScreen";

type ChatFormProps = {
  messages: ChatMessage[];
  currentQuestion: Question | null;
  isTyping: boolean;
  isCompleted: boolean;
  answeredCount: number;
  totalQuestions: number;
  completionConfig: CompletionConfig;
  answers: Answer[];
  allQuestions: Question[];
  userProfile?: { displayName: string; pictureUrl?: string };
  onAnswer: (values: string[]) => void;
  onBack: () => void;
  onSendMessage: () => Promise<void>;
  onClose: () => void;
  onReset: () => void;
};

export function ChatForm({
  messages,
  currentQuestion,
  isTyping,
  isCompleted,
  answeredCount,
  totalQuestions,
  completionConfig,
  answers,
  allQuestions,
  userProfile,
  onAnswer,
  onBack,
  onSendMessage,
  onClose,
  onReset,
}: ChatFormProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or typing state change
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  if (isCompleted) {
    return (
      <div className="flex flex-col h-full">
        <ChatHeader
          title="Chat Form"
          currentStep={totalQuestions}
          totalSteps={totalQuestions}
          userProfile={userProfile}
        />
        <CompletionScreen
          completionConfig={completionConfig}
          answers={answers}
          questions={allQuestions}
          onSendMessage={onSendMessage}
          onClose={onClose}
        />
        <div className="px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <button
            onClick={onReset}
            className="w-full py-2.5 text-[13px] font-medium text-text-sub"
          >
            最初からやり直す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        title="Chat Form"
        currentStep={answeredCount}
        totalSteps={totalQuestions}
        userProfile={userProfile}
      />

      {/* Message area */}
      <div
        ref={messageAreaRef}
        className="flex-1 overflow-y-auto chat-messages py-5"
      >
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              animate={i >= messages.length - 2}
            />
          ))}

          {isTyping && <TypingIndicator />}
        </div>

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Back button + Options */}
      <div>
        {answeredCount > 0 && !isTyping && currentQuestion && (
          <div className="px-4 pt-1 pb-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[13px] font-medium text-text-sub active:opacity-60 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              前の質問に戻る
            </button>
          </div>
        )}

        {currentQuestion && !isTyping && (
          <OptionButtons
            key={currentQuestion.id}
            options={currentQuestion.options as Option[]}
            type={currentQuestion.type}
            onSubmit={onAnswer}
          />
        )}
      </div>
    </div>
  );
}
