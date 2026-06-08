package com.chineseapp.dto.writing;

import java.util.List;

public record WritingFeedbackResponse(String correctedText, List<Comment> comments) {
    public record Comment(String issue, String suggestion, String severity) {}
}
