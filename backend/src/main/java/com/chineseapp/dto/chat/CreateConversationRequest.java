package com.chineseapp.dto.chat;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateConversationRequest(
    @NotBlank @Size(max = 80) String topicTitle,
    @NotBlank @Size(max = 1200) String scenario,
    @Min(1) @Max(6) Integer hskLevel,
    @Size(max = 8) String lang
) {
    /** Three-arg form keeps the Mandarin default when no practice language is given. */
    public CreateConversationRequest(String topicTitle, String scenario, Integer hskLevel) {
        this(topicTitle, scenario, hskLevel, null);
    }

    /** Custom (non-HSK) conversation: no level cap beyond the global HSK 4 ceiling. */
    public CreateConversationRequest(String topicTitle, String scenario) {
        this(topicTitle, scenario, null, null);
    }
}
