package com.chineseapp.service.impl;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.writing.CreateWritingPromptRequest;
import com.chineseapp.dto.writing.WritingFeedbackRequest;
import com.chineseapp.dto.writing.WritingFeedbackResponse;
import com.chineseapp.dto.writing.WritingPromptResponse;
import com.chineseapp.exception.ApiException;
import com.chineseapp.service.WritingFeedbackService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
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
    private static final String DEFAULT_TOPIC = "My daily routine";
    private static final String DEFAULT_CONTEXT = "Create an HSK 2 writing task about daily routine.";

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
    private static final String PROMPT_PLANNER_PROMPT = """
        You create Mandarin writing-practice prompts for an HSK 2-3 learner.
        Return ONLY one valid JSON object with exactly these fields:
        {
          "title": "short English or Vietnamese title, max 8 words",
          "promptText": "one clear simplified-Chinese writing prompt, asking for 3-5 sentences",
          "level": "HSK 2 or HSK 3"
        }
        The promptText must be practical, concrete, and appropriate for the learner's level.
        Do not use markdown or add text outside the JSON object.
        """;
    private static final String HSK_PROMPT_PLANNER_PROMPT = """
        You create Mandarin WRITING-EXAM practice prompts for a learner preparing for the HSK 书写/写作 section at a specific level.
        Return ONLY one valid JSON object with exactly these fields:
        {
          "title": "short English or Vietnamese title, max 8 words",
          "promptText": "one clear simplified-Chinese writing prompt for this exact lesson topic and HSK level",
          "level": "HSK <the requested level>"
        }
        The requested HSK level and lesson topic are authoritative. Build the prompt ONLY from them and keep it tightly on that lesson topic.
        The promptText must restrict its expected vocabulary and grammar to the requested HSK level or lower, and must ask for an amount of writing appropriate to that level (HSK 1-2: 2-4 simple sentences; HSK 3: a short paragraph of 4-6 sentences; HSK 4: a paragraph of about 80 characters).
        The "level" field must echo the requested level exactly, e.g. "HSK 3".
        Do not use markdown or add text outside the JSON object.
        """;

    private final LlmClient llm;
    private final ObjectMapper objectMapper;

    public WritingFeedbackServiceImpl(LlmClient llm, ObjectMapper objectMapper) {
        this.llm = llm;
        this.objectMapper = objectMapper;
    }

    @Override
    public WritingPromptResponse createPrompt(CreateWritingPromptRequest req) {
        String topic = clean(req == null ? null : req.topicTitle());
        String context = clean(req == null ? null : req.context());
        Integer hskLevel = req == null ? null : req.hskLevel();
        if (!StringUtils.hasText(topic)) {
            topic = DEFAULT_TOPIC;
        }
        if (!StringUtils.hasText(context)) {
            context = DEFAULT_CONTEXT;
        }

        boolean hsk = hskLevel != null;
        String userMessage = hsk
            ? """
                Target exam level: HSK %d
                Lesson topic: %s

                Lesson focus / context:
                %s
                """.formatted(hskLevel, topic, context)
            : """
                Topic: %s

                Learner-provided context:
                %s
                """.formatted(topic, context);

        String raw = llm.chat(List.of(
            new LlmClient.LlmMessage("system", hsk ? HSK_PROMPT_PLANNER_PROMPT : PROMPT_PLANNER_PROMPT),
            new LlmClient.LlmMessage("user", userMessage)
        ));

        try {
            JsonNode root = objectMapper.readTree(stripFences(raw));
            String title = root.path("title").asText("").trim();
            String promptText = root.path("promptText").asText("").trim();
            String level = root.path("level").asText(hsk ? "HSK " + hskLevel : "HSK 2").trim();
            if (!StringUtils.hasText(title) || !StringUtils.hasText(promptText)) {
                throw new IllegalArgumentException("missing writing prompt field");
            }
            return new WritingPromptResponse(trim(title, 80), promptText, trim(level, 20));
        } catch (Exception ex) {
            log.debug("LLM returned invalid writing prompt: {}", raw);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "LLM returned invalid writing prompt");
        }
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

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String trim(String value, int maxLength) {
        String cleaned = clean(value);
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength).trim();
    }
}
