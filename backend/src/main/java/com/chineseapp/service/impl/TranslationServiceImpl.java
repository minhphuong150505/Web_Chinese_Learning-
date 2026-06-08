package com.chineseapp.service.impl;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.translation.TranslationRequest;
import com.chineseapp.dto.translation.TranslationResponse;
import com.chineseapp.service.TranslationService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TranslationServiceImpl implements TranslationService {
    private static final String SYSTEM_PROMPT_VI_TO_ZH = """
        You translate Vietnamese to Simplified Chinese.
        - Output ONLY the Chinese translation, no commentary.
        - Use natural modern Mandarin (Mainland), not Classical Chinese.
        """;
    private static final String SYSTEM_PROMPT_ZH_TO_VI = """
        You translate Simplified Chinese to Vietnamese.
        - Output ONLY the Vietnamese translation, no commentary.
        - Use natural modern Vietnamese.
        """;

    private final LlmClient llm;

    public TranslationServiceImpl(LlmClient llm) {
        this.llm = llm;
    }

    @Override
    public TranslationResponse translate(TranslationRequest req) {
        String system = switch (req.direction()) {
            case VI_TO_ZH -> SYSTEM_PROMPT_VI_TO_ZH;
            case ZH_TO_VI -> SYSTEM_PROMPT_ZH_TO_VI;
        };
        String out = llm.chat(List.of(
            new LlmClient.LlmMessage("system", system),
            new LlmClient.LlmMessage("user", req.text())
        ));
        return new TranslationResponse(out.trim());
    }
}
