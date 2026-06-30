package com.chineseapp.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.HashMap;
import java.util.Map;

@Validated
@ConfigurationProperties("app.tts")
public class TtsProperties {
    @NotBlank
    private String baseUrl;

    @NotBlank
    private String voice;

    /** Per target-language voice ({@code zh}, {@code en}, …); falls back to {@link #voice}. */
    private Map<String, String> voices = new HashMap<>(Map.of(
        "zh", "zh-CN-XiaoxiaoNeural",
        "en", "en-US-AriaNeural"
    ));

    @NotBlank
    private String storageDir;

    /** Resolves a target-language code to its edge-tts voice, falling back to {@link #voice}. */
    public String resolveVoice(String lang) {
        if (lang == null || lang.isBlank()) {
            return voice;
        }
        return voices.getOrDefault(lang, voice);
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getVoice() {
        return voice;
    }

    public void setVoice(String voice) {
        this.voice = voice;
    }

    public Map<String, String> getVoices() {
        return voices;
    }

    public void setVoices(Map<String, String> voices) {
        this.voices = voices;
    }

    public String getStorageDir() {
        return storageDir;
    }

    public void setStorageDir(String storageDir) {
        this.storageDir = storageDir;
    }
}
