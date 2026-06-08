package com.chineseapp.dto.chat;

import com.chineseapp.dto.pronunciation.PronunciationResponse;

public record VoiceTurnResponse(
    MessageDto userMessage,
    MessageDto assistantMessage,
    PronunciationResponse pronunciation,
    int contextScore,
    int grammarScore,
    String feedback,
    String suggestedReply
) {
}
