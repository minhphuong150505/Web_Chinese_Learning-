package com.chineseapp.dto.writing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record CreateWritingPromptRequest(
    @Size(max = 80) String topicTitle,
    @Size(max = 1200) String context,
    @Min(1) @Max(6) Integer hskLevel,
    @Size(max = 8) String lang
) {
    /** Three-arg form keeps the Mandarin default when no practice language is given. */
    public CreateWritingPromptRequest(String topicTitle, String context, Integer hskLevel) {
        this(topicTitle, context, hskLevel, null);
    }

    /** Custom (non-HSK) writing task: level is decided by the planner. */
    public CreateWritingPromptRequest(String topicTitle, String context) {
        this(topicTitle, context, null, null);
    }
}
