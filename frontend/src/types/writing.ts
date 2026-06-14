export type CommentSeverity = 'info' | 'warn' | 'error';

export interface WritingFeedbackRequest {
  text: string;
  topic: string | null;
}

export interface CreateWritingPromptRequest {
  topicTitle: string;
  context: string;
  /** 1-6 for HSK exam-prep writing tasks; omitted for free custom tasks. */
  hskLevel?: number;
}

export interface WritingPromptResponse {
  title: string;
  promptText: string;
  level: string;
}

export interface WritingComment {
  issue: string;
  suggestion: string;
  severity: CommentSeverity;
}

export interface WritingFeedbackResponse {
  correctedText: string;
  comments: WritingComment[];
}
