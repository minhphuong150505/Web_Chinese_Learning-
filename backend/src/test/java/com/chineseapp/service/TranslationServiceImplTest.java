package com.chineseapp.service;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.translation.TranslationRequest;
import com.chineseapp.dto.translation.TranslationRequest.Direction;
import com.chineseapp.dto.translation.TranslationResponse;
import com.chineseapp.service.impl.TranslationServiceImpl;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TranslationServiceImplTest {

    @Test
    void translate_givenViToZh_thenUsesViToZhSystemPromptAndTrimsOutput() {
        LlmClient llm = mock(LlmClient.class);
        when(llm.chat(any())).thenReturn("  我在学中文  ");
        TranslationService service = new TranslationServiceImpl(llm);

        TranslationResponse response = service.translate(
            new TranslationRequest("Tôi đang học tiếng Trung", Direction.VI_TO_ZH));

        assertThat(response.translation()).isEqualTo("我在学中文");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmClient.LlmMessage>> captor = ArgumentCaptor.forClass(List.class);
        verify(llm).chat(captor.capture());
        List<LlmClient.LlmMessage> messages = captor.getValue();
        assertThat(messages).hasSize(2);
        assertThat(messages.get(0).role()).isEqualTo("system");
        assertThat(messages.get(0).content()).contains("Vietnamese to Simplified Chinese");
        assertThat(messages.get(1).role()).isEqualTo("user");
        assertThat(messages.get(1).content()).isEqualTo("Tôi đang học tiếng Trung");
    }

    @Test
    void translate_givenZhToVi_thenUsesZhToViSystemPrompt() {
        LlmClient llm = mock(LlmClient.class);
        when(llm.chat(any())).thenReturn("Tôi yêu bạn");
        TranslationService service = new TranslationServiceImpl(llm);

        TranslationResponse response = service.translate(
            new TranslationRequest("我爱你", Direction.ZH_TO_VI));

        assertThat(response.translation()).isEqualTo("Tôi yêu bạn");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmClient.LlmMessage>> captor = ArgumentCaptor.forClass(List.class);
        verify(llm).chat(captor.capture());
        assertThat(captor.getValue().get(0).content()).contains("Simplified Chinese to Vietnamese");
    }
}
