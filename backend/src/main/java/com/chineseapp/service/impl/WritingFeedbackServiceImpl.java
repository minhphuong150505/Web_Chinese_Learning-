package com.chineseapp.service.impl;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.writing.WritingFeedbackRequest;
import com.chineseapp.dto.writing.WritingFeedbackResponse;
import com.chineseapp.exception.ApiException;
import com.chineseapp.service.WritingFeedbackService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class WritingFeedbackServiceImpl implements WritingFeedbackService {
    private static final Logger log = LoggerFactory.getLogger(WritingFeedbackServiceImpl.class);

    private static final String SYSTEM_PROMPT = """
        You are a Chinese writing tutor. Given a learner's Chinese text, return strict JSON:
        {
          "correctedText": "<full corrected text>",
          "comments": [
            { "issue": "<what is wrong>", "suggestion": "<how to fix>", "severity": "info|warn|error" }
          ]
        }
        Do not include any text outside the JSON.
        """;

    private final LlmClient llm;
    private final ObjectMapper objectMapper;

    public WritingFeedbackServiceImpl(LlmClient llm, ObjectMapper objectMapper) {
        this.llm = llm;
        this.objectMapper = objectMapper;
    }

    @Override
    public WritingFeedbackResponse review(WritingFeedbackRequest req) {
        String userMessage = StringUtils.hasText(req.topic())
            ? "Topic: " + req.topic() + "\n\n" + req.text()
            : req.text();

        String raw = llm.chat(List.of(
            new LlmClient.LlmMessage("system", SYSTEM_PROMPT),
            new LlmClient.LlmMessage("user", userMessage)
        ));

        String json = stripFences(raw);
        try {
            return objectMapper.readValue(json, WritingFeedbackResponse.class);
        } catch (JsonProcessingException ex) {
            log.debug("LLM returned non-JSON writing feedback: {}", raw);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "LLM returned non-JSON");
        }
    }

    private String stripFences(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            s = firstNewline >= 0 ? s.substring(firstNewline + 1) : s.substring(3);
            if (s.endsWith("```")) {
                s = s.substring(0, s.length() - 3);
            }
        }
        return s.trim();
    }
}
