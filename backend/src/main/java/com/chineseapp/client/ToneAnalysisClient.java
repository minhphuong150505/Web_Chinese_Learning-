package com.chineseapp.client;

import com.chineseapp.config.TtsProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.File;
import java.time.Duration;
import java.util.List;

/**
 * Calls the Python tone-analysis service to score each syllable's Mandarin tone
 * from the recorded pitch contour. Best-effort: any failure (service down,
 * engine unavailable, bad audio) returns an empty list so pronunciation scoring
 * still succeeds without tone feedback.
 */
@Component
public class ToneAnalysisClient {
    private static final Logger log = LoggerFactory.getLogger(ToneAnalysisClient.class);

    private final WebClient webClient;
    private final TtsProperties props;
    private final ObjectMapper objectMapper;

    public ToneAnalysisClient(WebClient webClient, TtsProperties props, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /** Returns one result per input syllable, in order. Empty list on failure. */
    public List<ToneResult> analyze(File wav, List<SyllableInput> syllables) {
        if (syllables.isEmpty()) {
            return List.of();
        }
        try {
            String syllablesJson = objectMapper.writeValueAsString(syllables);

            MultipartBodyBuilder body = new MultipartBodyBuilder();
            body.part("audio", new FileSystemResource(wav))
                .filename(wav.getName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
            body.part("syllables", syllablesJson);

            ToneAnalysisResponse response = webClient.post()
                .uri(props.getBaseUrl() + "/tone-analyze")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(body.build()))
                .retrieve()
                .bodyToMono(ToneAnalysisResponse.class)
                .block(Duration.ofSeconds(10));

            if (response == null || response.syllables() == null) {
                return List.of();
            }
            return response.syllables();
        } catch (Exception ex) {
            log.warn("Tone analysis unavailable, continuing without tone scores: {}", ex.getMessage());
            return List.of();
        }
    }

    /** Input syllable: pinyin (toneless), expected tone (0-4), and time window in seconds. */
    public record SyllableInput(String pinyin, int tone, double start, double dur) {}

    public record ToneResult(String pinyin, Integer expectedTone, Integer detectedTone, Double toneScore) {}

    private record ToneAnalysisResponse(boolean engineReady, List<ToneResult> syllables) {}
}
