package com.chineseapp.service;

import com.chineseapp.dto.writing.WritingFeedbackRequest;
import com.chineseapp.dto.writing.WritingFeedbackResponse;

public interface WritingFeedbackService {
    WritingFeedbackResponse review(WritingFeedbackRequest req);
}
