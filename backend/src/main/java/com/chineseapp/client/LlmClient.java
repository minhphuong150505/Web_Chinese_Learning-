package com.chineseapp.client;

import java.util.List;

public interface LlmClient {
    String chat(List<LlmMessage> messages);

    record LlmMessage(String role, String content) {}
}
