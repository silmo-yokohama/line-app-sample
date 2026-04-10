import { useLiff } from "./hooks/useLiff";
import { useChatForm } from "./hooks/useChatForm";
import {
  getCompletionConfig,
  getAllQuestions,
  getTotalQuestionCount,
} from "./lib/questionEngine";
import { sendLineMessage, closeLiff } from "./lib/liff";
import { ChatForm } from "./components/ChatForm";

function App() {
  const { isReady, isLoggedIn, profile, error } = useLiff();
  const {
    messages,
    currentQuestion,
    answers,
    isCompleted,
    isTyping,
    answeredCount,
    handleAnswer,
    handleBack,
    resetForm,
  } = useChatForm();

  const completionConfig = getCompletionConfig();
  const allQuestions = getAllQuestions();
  const totalQuestions = getTotalQuestionCount();

  const handleSendMessage = async () => {
    const sent = await sendLineMessage(completionConfig.lineMessage);
    if (!sent) {
      throw new Error("LIFF外では送信できません");
    }
  };

  const handleClose = () => {
    closeLiff();
  };

  // Loading
  if (!isReady) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center shadow-[0_8px_24px_rgba(255,107,157,0.35)] animate-pulse">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text-sub">読み込み中...</p>
      </div>
    );
  }

  // LIFF error (still show the form for development)
  if (error && !isLoggedIn) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-pink-50 border-b border-pink-100 px-4 py-2 flex-shrink-0">
          <p className="text-xs text-pink-500 font-medium text-center">
            開発モード（LIFF未接続）
          </p>
        </div>
        <ChatForm
          messages={messages}
          currentQuestion={currentQuestion}
          isTyping={isTyping}
          isCompleted={isCompleted}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          completionConfig={completionConfig}
          answers={answers}
          allQuestions={allQuestions}
          onAnswer={handleAnswer}
          onBack={handleBack}
          onSendMessage={handleSendMessage}
          onClose={handleClose}
          onReset={resetForm}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ChatForm
        messages={messages}
        currentQuestion={currentQuestion}
        isTyping={isTyping}
        isCompleted={isCompleted}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        completionConfig={completionConfig}
        answers={answers}
        allQuestions={allQuestions}
        userProfile={profile ?? undefined}
        onAnswer={handleAnswer}
        onBack={handleBack}
        onSendMessage={handleSendMessage}
        onClose={handleClose}
        onReset={resetForm}
      />
    </div>
  );
}

export default App;
