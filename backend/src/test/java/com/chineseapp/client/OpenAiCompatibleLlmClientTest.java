package com.chineseapp.client;

import com.chineseapp.config.LlmProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.reactive.MockClientHttpRequest;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenAiCompatibleLlmClientTest {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void chat_givenSuccessfulResponse_thenSendsRequestAndReturnsContent() throws Exception {
        AtomicReference<ClientRequest> capturedRequest = new AtomicReference<>();
        AtomicReference<String> capturedBody = new AtomicReference<>();
        ExchangeFunction exchangeFunction = request -> {
            capturedRequest.set(request);
            capturedBody.set(bodyAsString(request));
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body("""
                    {
                      "choices": [
                        {
                          "message": {
                            "content": "你好！"
                          }
                        }
                      ]
                    }
                    """)
                .build());
        };
        OpenAiCompatibleLlmClient client = new OpenAiCompatibleLlmClient(
            webClient(exchangeFunction),
            properties()
        );

        String response = client.chat(List.of(new LlmClient.LlmMessage("user", "你好")));

        assertThat(response).isEqualTo("你好！");
        assertThat(capturedRequest.get().method()).isEqualTo(HttpMethod.POST);
        assertThat(capturedRequest.get().url().toString())
            .isEqualTo("https://api.deepseek.com/chat/completions");
        assertThat(capturedRequest.get().headers().getFirst(HttpHeaders.AUTHORIZATION))
            .isEqualTo("Bearer test-api-key");
        assertThat(capturedRequest.get().headers().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);

        JsonNode body = objectMapper.readTree(capturedBody.get());
        assertThat(body.get("model").asText()).isEqualTo("deepseek-v4-flash");
        assertThat(body.get("temperature").asDouble()).isEqualTo(0.7);
        assertThat(body.get("max_tokens").asInt()).isEqualTo(1024);
        assertThat(body.get("messages").get(0).get("role").asText()).isEqualTo("user");
        assertThat(body.get("messages").get(0).get("content").asText()).isEqualTo("你好");
    }

    @Test
    void chat_givenUnauthorizedResponse_thenThrows() {
        ExchangeFunction exchangeFunction = request -> Mono.just(ClientResponse.create(HttpStatus.UNAUTHORIZED)
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .body("{\"error\":\"unauthorized\"}")
            .build());
        OpenAiCompatibleLlmClient client = new OpenAiCompatibleLlmClient(
            webClient(exchangeFunction),
            properties()
        );

        assertThatThrownBy(() -> client.chat(List.of(new LlmClient.LlmMessage("user", "你好"))))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("LLM call failed");
    }

    private static WebClient webClient(ExchangeFunction exchangeFunction) {
        return WebClient.builder()
            .exchangeFunction(exchangeFunction)
            .build();
    }

    private static LlmProperties properties() {
        LlmProperties properties = new LlmProperties();
        properties.setBaseUrl("https://api.deepseek.com");
        properties.setApiKey("test-api-key");
        properties.setChatModel("deepseek-v4-flash");
        properties.setTimeoutSeconds(60);
        return properties;
    }

    private static String bodyAsString(ClientRequest request) {
        MockClientHttpRequest mockRequest = new MockClientHttpRequest(request.method(), request.url());
        request.writeTo(mockRequest, ExchangeStrategies.withDefaults()).block();
        return mockRequest.getBodyAsString().block();
    }
}
