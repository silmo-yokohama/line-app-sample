import type { Question, QuestionnaireData, CompletionConfig } from "../types";
import questionData from "../data/questions.json";

const data = questionData as QuestionnaireData;

export function getFirstQuestion(): Question {
  return data.questions[0];
}

export function getQuestionById(id: string): Question | undefined {
  return data.questions.find((q) => q.id === id);
}

export function getNextQuestion(
  currentQuestionId: string,
  answerValues: string[]
): Question | null {
  const current = getQuestionById(currentQuestionId);
  if (!current?.next) return null;

  const { conditions, default: defaultId } = current.next;

  if (conditions) {
    for (const condition of conditions) {
      const { equals, includes } = condition.if;

      if (equals && answerValues.includes(equals)) {
        const next = getQuestionById(condition.then);
        if (next) return next;
      }

      if (includes && answerValues.includes(includes)) {
        const next = getQuestionById(condition.then);
        if (next) return next;
      }
    }
  }

  if (defaultId) {
    return getQuestionById(defaultId) ?? null;
  }

  return null;
}

export function getCompletionConfig(): CompletionConfig {
  return data.completion;
}

export function getAllQuestions(): Question[] {
  return data.questions;
}

export function getTotalQuestionCount(): number {
  return data.questions.length;
}
