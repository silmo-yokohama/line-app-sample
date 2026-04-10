export type Option = {
  value: string;
  label: string;
};

export type Condition = {
  if: { equals?: string; includes?: string };
  then: string;
};

export type NextRule = {
  default?: string;
  conditions?: Condition[];
};

export type Question = {
  id: string;
  text: string;
  type: "single" | "multiple";
  options: Option[];
  next?: NextRule;
};

export type CompletionConfig = {
  message: string;
  lineMessage: string;
};

export type QuestionnaireData = {
  questions: Question[];
  completion: CompletionConfig;
};

export type Answer = {
  questionId: string;
  values: string[];
};

export type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  timestamp: number;
};
