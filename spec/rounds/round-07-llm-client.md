# Round 07 — LLM client

> **Milestone:** M1
> **Effort:** M (30–60 min)
> **Prerequisites:** Round 06 complete
> **Blocks if:** `LLM_API_KEY` is not set in `.env`. **Stop and ask the user before starting.**

## Pre-round checklist

1. Verify the user has placed `LLM_API_KEY=sk-...` in `.env`.
2. Open https://api-docs.deepseek.com/ and confirm:
   - The base URL is still `https://api.deepseek.com`.
   - The chat model name is still `deepseek-v4-flash` (or note the new name and tell the user to update `LLM_CHAT_MODEL` in `.env`).
3. If either of these has changed, **stop and report to the user** before writing code.

## Goal

A `LlmClient` interface with one `OpenAiCompatibleLlmClient` implementation that talks to DeepSeek. Has a unit test that uses a mocked `WebClient` exchange.

## Files to create

- `backend/src/main/java/com/chineseapp/config/LlmProperties.java`
- `backend/src/main/java/com/chineseapp/config/WebClientConfig.java`
- `backend/src/main/java/com/chineseapp/client/LlmClient.java` (interface)
- `backend/src/main/java/com/chineseapp/client/OpenAiCompatibleLlmClient.java`
- `backend/src/test/java/com/chineseapp/client/OpenAiCompatibleLlmClientTest.java`

## Files to modify

- `backend/src/main/java/com/chineseapp/ChineseAppApplication.java` — add `@ConfigurationPropertiesScan` so all `@ConfigurationProperties` classes in later rounds bind consistently.

## Steps

1. Create `LlmProperties` with `@ConfigurationProperties("app.llm")`:
   - Fields: `provider` (String), `baseUrl` (String), `apiKey` (String), `chatModel` (String), `reasoningModel` (String), `timeoutSeconds` (int, default 60).
   - Provide getters and setters (required by Spring Boot binding when not using records).
   - Annotate the class with `@Validated` and use `@NotBlank` on `baseUrl`, `apiKey`, `chatModel`.
2. Enable property scanning by adding `@ConfigurationPropertiesScan` to `ChineseAppApplication`. Do not annotate individual properties classes with `@Component`; the scan is the single binding mechanism for `LlmProperties`, `TtsProperties`, `AzureSpeechProperties`, and `AuthProperties`.
3. Create `WebClientConfig`:
   ```java
   @Configuration
   public class WebClientConfig {
       @Bean
       public WebClient webClient() {
           return WebClient.builder()
               .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024))
               .build();
       }
   }
   ```
4. Create `LlmClient` interface per `spec/05-backend.md` § "Client interface pattern":
   ```java
   public interface LlmClient {
       String chat(List<LlmMessage> messages);
       record LlmMessage(String role, String content) {}
   }
   ```
5. Create `OpenAiCompatibleLlmClient`:
   - Constructor takes `WebClient`, `LlmProperties`.
   - In `chat()`:
     - Build a request body: `{ "model": props.chatModel, "messages": messages, "temperature": 0.7, "max_tokens": 1024 }`.
     - POST to `${props.baseUrl}/chat/completions`.
     - Header `Authorization: Bearer ${props.apiKey}`.
     - Block with timeout `Duration.ofSeconds(props.timeoutSeconds)`.
     - Parse response as `Map`, extract `choices[0].message.content`.
     - On any failure (timeout, 4xx, 5xx, parsing): throw `ApiException(HttpStatus.BAD_GATEWAY, "LLM call failed: <reason>")`.
     - **Note:** `ApiException` will be created in Round 8. For this round, throw `RuntimeException("LLM call failed: ...")` and replace with `ApiException` in Round 8.
     - **Do not log the API key.**
6. Write unit test using `ExchangeFunction` mock to assert:
   - Sends correct headers and body.
   - Parses `choices[0].message.content` correctly on 200.
   - Throws on 401.

## References

- `spec/05-backend.md` § "Client interface pattern"
- `spec/07-external-apis.md` §7.1

## Verification

- [ ] `./mvnw test` passes including the new test.
- [ ] Manual smoke test (one-shot script or `CommandLineRunner` in a scratch branch — **delete before commit**) calling `llmClient.chat(...)` with a real key returns a Chinese reply to "你好".
- [ ] Backend logs do not contain the API key in any form.

## When complete

1. Update Round 07 status.
2. Report: "Round 07 done. Next: Round 08 — Conversation service + error handling."
3. **Stop.**
