package com.chineseapp.client;

import com.chineseapp.client.ToneAnalysisClient.SyllableInput;
import com.chineseapp.client.ToneAnalysisClient.ToneResult;
import com.chineseapp.config.TtsProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.util.StreamUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.File;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises the real Java -> Python seam end to end: a genuine WebClient
 * serialises the multipart request over HTTP to a stub server, and the JSON
 * response is deserialised back into {@link ToneResult}s. This is the one place
 * a multipart-encoding or contract mismatch with the FastAPI service would show.
 */
class ToneAnalysisClientTest {

    private HttpServer server;
    private final AtomicReference<String> capturedContentType = new AtomicReference<>();
    private final AtomicReference<String> capturedBody = new AtomicReference<>();

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/tone-analyze", this::handle);
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private void handle(HttpExchange exchange) throws java.io.IOException {
        capturedContentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
        capturedBody.set(StreamUtils.copyToString(exchange.getRequestBody(), StandardCharsets.UTF_8));
        byte[] response = ("""
            {"engineReady":true,"syllables":[
              {"pinyin":"ni","expectedTone":3,"detectedTone":3,"toneScore":95.0},
              {"pinyin":"hao","expectedTone":3,"detectedTone":1,"toneScore":20.0}
            ]}""").getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length);
        try (var os = exchange.getResponseBody()) {
            os.write(response);
        }
    }

    @Test
    void analyze_sendsMultipartAndParsesResponse() throws Exception {
        TtsProperties props = new TtsProperties();
        props.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        props.setVoice("zh-CN-XiaoxiaoNeural");
        props.setStorageDir("/tmp");
        ToneAnalysisClient client = new ToneAnalysisClient(
            WebClient.builder().build(), props, new ObjectMapper());

        File wav = File.createTempFile("seam-", ".wav");
        Files.write(wav.toPath(), new byte[]{0, 1, 2, 3, 4});
        try {
            List<ToneResult> results = client.analyze(wav, List.of(
                new SyllableInput("ni", 3, 0.05, 0.30),
                new SyllableInput("hao", 3, 0.35, 0.30)
            ));

            // Response parsed back into typed results.
            assertThat(results).hasSize(2);
            assertThat(results.get(0).detectedTone()).isEqualTo(3);
            assertThat(results.get(0).toneScore()).isEqualTo(95.0);
            assertThat(results.get(1).detectedTone()).isEqualTo(1);

            // Request actually went out as multipart with both parts the FastAPI
            // endpoint expects (audio file part + syllables JSON part).
            assertThat(capturedContentType.get()).startsWith("multipart/form-data");
            String body = capturedBody.get();
            assertThat(body).contains("name=\"audio\"");
            assertThat(body).contains("filename=");
            assertThat(body).contains("name=\"syllables\"");
            assertThat(body).contains("\"pinyin\":\"ni\"");
            assertThat(body).contains("\"tone\":3");
            assertThat(body).contains("\"start\":0.05");
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void analyze_returnsEmptyWhenServiceUnavailable() throws Exception {
        server.stop(0); // simulate the tone service being down
        TtsProperties props = new TtsProperties();
        props.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        props.setVoice("v");
        props.setStorageDir("/tmp");
        ToneAnalysisClient client = new ToneAnalysisClient(
            WebClient.builder().build(), props, new ObjectMapper());

        File wav = File.createTempFile("seam-down-", ".wav");
        Files.write(wav.toPath(), new byte[]{0, 1});
        try {
            // Best-effort: a dead tone service must not break pronunciation scoring.
            assertThat(client.analyze(wav, List.of(new SyllableInput("ni", 3, 0.0, 0.3)))).isEmpty();
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }
}
