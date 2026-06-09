package com.chineseapp.service;

import com.chineseapp.dto.writing.CreateWritingPromptRequest;
import com.chineseapp.dto.writing.WritingFeedbackRequest;
import com.chineseapp.dto.writing.WritingFeedbackResponse;
import com.chineseapp.dto.writing.WritingPromptResponse;

public interface WritingFeedbackService {
    WritingPromptResponse createPrompt(CreateWritingPromptRequest req);

    WritingFeedbackResponse review(WritingFeedbackRequest req);
}
