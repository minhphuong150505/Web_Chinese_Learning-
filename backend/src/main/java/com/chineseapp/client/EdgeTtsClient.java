package com.chineseapp.client;

import com.chineseapp.config.TtsProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
public class EdgeTtsClient {
    private final WebClient webClient;
    private final TtsProperties props;

    public EdgeTtsClient(WebClient webClient, TtsProperties props) {
        this.webClient = webClient;
        this.props = props;
    }

    public byte[] synthesize(String text) {
        String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8);
        String encodedVoice = URLEncoder.encode(props.getVoice(), StandardCharsets.UTF_8);
        return webClient.get()
            .uri(URI.create(props.getBaseUrl() + "/tts?text=" + encodedText + "&voice=" + encodedVoice))
            .retrieve()
            .bodyToMono(byte[].class)
            .block(Duration.ofSeconds(30));
    }
}
