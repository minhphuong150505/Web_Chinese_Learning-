package com.chineseapp.client;

import com.chineseapp.config.LlmProperties;
import com.chineseapp.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiCompatibleLlmClient implements LlmClient {
    private final WebClient webClient;
    private final LlmProperties properties;

    public OpenAiCompatibleLlmClient(WebClient webClient, LlmProperties properties) {
        this.webClient = webClient;
        this.properties = properties;
    }

    @Override
    public String chat(List<LlmMessage> messages) {
        Map<String, Object> requestBody = Map.of(
            "model", properties.getChatModel(),
            "messages", messages,
            "temperature", 0.7,
            "max_tokens", 1024
        );

        try {
            Map<?, ?> response = webClient.post()
                .uri(properties.getBaseUrl() + "/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + properties.getApiKey())
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block(Duration.ofSeconds(properties.getTimeoutSeconds()));

            return extractContent(response);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "LLM call failed: " + ex.getMessage());
        }
    }

    private String extractContent(Map<?, ?> response) {
        if (response == null) {
            throw new IllegalStateException("empty response");
        }

        Object choicesValue = response.get("choices");
        if (!(choicesValue instanceof List<?> choices) || choices.isEmpty()) {
            throw new IllegalStateException("missing choices");
        }

        Object firstChoice = choices.get(0);
        if (!(firstChoice instanceof Map<?, ?> choice)) {
            throw new IllegalStateException("invalid choice");
        }

        Object messageValue = choice.get("message");
        if (!(messageValue instanceof Map<?, ?> message)) {
            throw new IllegalStateException("missing message");
        }

        Object content = message.get("content");
        if (!(content instanceof String text)) {
            throw new IllegalStateException("missing message content");
        }

        return text;
    }
}
