package com.chineseapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@ConfigurationProperties("app.azure-speech")
public class AzureSpeechProperties {
    private String key = "";
    private String region = "";
    /** Default/fallback recognizer locale when a request's target language is unknown. */
    private String language = "zh-CN";
    /**
     * Maps a target-language code ({@code zh}, {@code en}, …) to an Azure
     * recognizer locale, so one deployment can assess multiple languages.
     */
    private Map<String, String> languages = new HashMap<>(Map.of(
        "zh", "zh-CN",
        "en", "en-US"
    ));

    /** Resolves a target-language code to its Azure locale, falling back to {@link #language}. */
    public String resolveLocale(String lang) {
        if (lang == null || lang.isBlank()) {
            return language;
        }
        return languages.getOrDefault(lang, language);
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Map<String, String> getLanguages() {
        return languages;
    }

    public void setLanguages(Map<String, String> languages) {
        this.languages = languages;
    }
}
