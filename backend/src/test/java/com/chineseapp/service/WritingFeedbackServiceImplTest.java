package com.chineseapp.service;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.writing.WritingFeedbackRequest;
import com.chineseapp.dto.writing.WritingFeedbackResponse;
import com.chineseapp.exception.ApiException;
import com.chineseapp.service.impl.WritingFeedbackServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WritingFeedbackServiceImplTest {

    private static final String VALID_JSON = """
        {
          "correctedText": "我昨天去了学校。",
          "comments": [
            { "issue": "Duplicated 了", "suggestion": "Remove the second 了.", "severity": "error" }
          ]
        }
        """;

    @Test
    void review_givenValidJson_thenDeserializesFields() {
        LlmClient llm = mock(LlmClient.class);
        when(llm.chat(any())).thenReturn(VALID_JSON);
        WritingFeedbackService service = new WritingFeedbackServiceImpl(llm, new ObjectMapper());

        WritingFeedbackResponse response = service.review(
            new WritingFeedbackRequest("我昨天去了学校了", null));

        assertThat(response.correctedText()).isEqualTo("我昨天去了学校。");
        assertThat(response.comments()).hasSize(1);
        assertThat(response.comments().get(0).issue()).isEqualTo("Duplicated 了");
        assertThat(response.comments().get(0).severity()).isEqualTo("error");
    }

    @Test
    void review_givenJsonWrappedInFences_thenStillParses() {
        LlmClient llm = mock(LlmClient.class);
        when(llm.chat(any())).thenReturn("```json\n" + VALID_JSON + "\n```");
        WritingFeedbackService service = new WritingFeedbackServiceImpl(llm, new ObjectMapper());

        WritingFeedbackResponse response = service.review(
            new WritingFeedbackRequest("我昨天去了学校了", null));

        assertThat(response.correctedText()).isEqualTo("我昨天去了学校。");
        assertThat(response.comments()).hasSize(1);
    }

    @Test
    void review_givenTopic_thenPrefixesUserMessage() {
        LlmClient llm = mock(LlmClient.class);
        when(llm.chat(any())).thenReturn(VALID_JSON);
        WritingFeedbackService service = new WritingFeedbackServiceImpl(llm, new ObjectMapper());

        service.review(new WritingFeedbackRequest("我每天七点起床。", "My daily routine"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmClient.LlmMessage>> captor = ArgumentCaptor.forClass(List.class);
        verify(llm).chat(captor.capture());
        List<LlmClient.LlmMessage> messages = captor.getValue();
        assertThat(messages.get(1).content()).isEqualTo("Topic: My daily routine\n\n我每天七点起床。");
    }

    @Test
    void review_givenNonJson_thenThrowsBadGateway() {
        LlmClient llm = mock(LlmClient.class);
        when(llm.chat(any())).thenReturn("asdfghjkl not json at all");
        WritingFeedbackService service = new WritingFeedbackServiceImpl(llm, new ObjectMapper());

        assertThatThrownBy(() -> service.review(new WritingFeedbackRequest("乱码", null)))
            .isInstanceOf(ApiException.class)
            .extracting("status")
            .isEqualTo(HttpStatus.BAD_GATEWAY);
    }
}
