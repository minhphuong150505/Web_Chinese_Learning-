package com.chineseapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.azure-speech")
public class AzureSpeechProperties {
    private String key = "";
    private String region = "";
    private String language = "zh-CN";

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
}
