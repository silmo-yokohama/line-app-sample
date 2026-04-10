import { useState, useEffect, useCallback, useRef } from "react";
import type { Question, ChatMessage, Answer } from "../types";
import {
  getFirstQuestion,
  getNextQuestion,
  getAllQuestions,
} from "../lib/questionEngine";
import { useLocalStorage } from "./useLocalStorage";

type UseChatFormReturn = {
  messages: ChatMessage[];
  currentQuestion: Question | null;
  answers: Answer[];
  isCompleted: boolean;
  isTyping: boolean;
  answeredCount: number;
  handleAnswer: (values: string[]) => void;
  handleBack: () => void;
  resetForm: () => void;
};

function createBotMessage(text: string): ChatMessage {
  return {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "bot",
    text,
    timestamp: Date.now(),
  };
}

function createUserMessage(text: string): ChatMessage {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "user",
    text,
    timestamp: Date.now(),
  };
}

function rebuildMessages(answers: Answer[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const allQuestions = getAllQuestions();

  for (const answer of answers) {
    const question = allQuestions.find((q) => q.id === answer.questionId);
    if (!question) continue;

    messages.push(createBotMessage(question.text));

    const labels = answer.values
      .map((v) => question.options.find((o) => o.value === v)?.label ?? v)
      .join("、");
    messages.push(createUserMessage(labels));
  }

  return messages;
}

export function useChatForm(): UseChatFormReturn {
  const [savedAnswers, setSavedAnswers, clearSavedAnswers] = useLocalStorage<
    Answer[]
  >("chat-form-answers", []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const initialized = useRef(false);

  // Initialize: restore from localStorage or start fresh
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (savedAnswers.length > 0) {
      const rebuilt = rebuildMessages(savedAnswers);
      setMessages(rebuilt);
      setAnswers(savedAnswers);

      const lastAnswer = savedAnswers[savedAnswers.length - 1];
      const next = getNextQuestion(lastAnswer.questionId, lastAnswer.values);

      if (next) {
        const botMsg = createBotMessage(next.text);
        setMessages((prev) => [...prev, botMsg]);
        setCurrentQuestion(next);
      } else {
        setIsCompleted(true);
      }
    } else {
      const first = getFirstQuestion();
      const botMsg = createBotMessage(first.text);
      setMessages([botMsg]);
      setCurrentQuestion(first);
    }
  }, [savedAnswers]);

  const handleAnswer = useCallback(
    (values: string[]) => {
      if (!currentQuestion || isTyping) return;

      const labels = values
        .map(
          (v) =>
            currentQuestion.options.find((o) => o.value === v)?.label ?? v
        )
        .join("、");

      const userMsg = createUserMessage(labels);
      setMessages((prev) => [...prev, userMsg]);

      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        values,
      };
      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);
      setSavedAnswers(newAnswers);

      setIsTyping(true);

      setTimeout(() => {
        const next = getNextQuestion(currentQuestion.id, values);

        if (next) {
          const botMsg = createBotMessage(next.text);
          setMessages((prev) => [...prev, botMsg]);
          setCurrentQuestion(next);
        } else {
          setIsCompleted(true);
          setCurrentQuestion(null);
        }

        setIsTyping(false);
      }, 500);
    },
    [currentQuestion, isTyping, answers, setSavedAnswers]
  );

  const handleBack = useCallback(() => {
    if (answers.length === 0 || isTyping) return;

    const prevAnswers = answers.slice(0, -1);
    setAnswers(prevAnswers);
    setSavedAnswers(prevAnswers);
    setIsCompleted(false);

    if (prevAnswers.length === 0) {
      const first = getFirstQuestion();
      setMessages([createBotMessage(first.text)]);
      setCurrentQuestion(first);
    } else {
      const rebuilt = rebuildMessages(prevAnswers);
      const lastAnswer = prevAnswers[prevAnswers.length - 1];
      const next = getNextQuestion(lastAnswer.questionId, lastAnswer.values);

      if (next) {
        rebuilt.push(createBotMessage(next.text));
        setCurrentQuestion(next);
      }

      setMessages(rebuilt);
    }
  }, [answers, isTyping, setSavedAnswers]);

  const resetForm = useCallback(() => {
    clearSavedAnswers();
    setAnswers([]);
    setIsCompleted(false);
    setIsTyping(false);

    const first = getFirstQuestion();
    setMessages([createBotMessage(first.text)]);
    setCurrentQuestion(first);
  }, [clearSavedAnswers]);

  return {
    messages,
    currentQuestion,
    answers,
    isCompleted,
    isTyping,
    answeredCount: answers.length,
    handleAnswer,
    handleBack,
    resetForm,
  };
}
