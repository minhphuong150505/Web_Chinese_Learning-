export type CommentSeverity = 'info' | 'warn' | 'error';

export interface WritingFeedbackRequest {
  text: string;
  topic: string | null;
}

export interface CreateWritingPromptRequest {
  topicTitle: string;
  context: string;
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
