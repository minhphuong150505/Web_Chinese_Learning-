export type CommentSeverity = 'info' | 'warn' | 'error';

export interface WritingFeedbackRequest {
  text: string;
  topic: string | null;
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
