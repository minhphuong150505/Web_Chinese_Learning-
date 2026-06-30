package com.chineseapp.service;

import com.chineseapp.client.EdgeTtsClient;
import com.chineseapp.config.TtsProperties;
import com.chineseapp.service.impl.TtsServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TtsServiceImplTest {

    @TempDir
    private Path tempDir;

    @Test
    void synthesize_givenClientBytes_thenWritesMp3AndReturnsFilename() throws Exception {
        EdgeTtsClient client = mock(EdgeTtsClient.class);
        TtsService service = new TtsServiceImpl(client, properties(tempDir));
        byte[] bytes = new byte[] { 1, 2, 3, 4 };
        when(client.synthesize(eq("你好"), any())).thenReturn(bytes);

        String filename = service.synthesize("你好");

        assertThat(filename).matches("^[a-f0-9-]+\\.mp3$");
        assertThat(Files.readAllBytes(tempDir.resolve(filename))).isEqualTo(bytes);
    }

    @Test
    void synthesize_givenClientThrows_thenReturnsNullAndCreatesNoFile() throws Exception {
        EdgeTtsClient client = mock(EdgeTtsClient.class);
        TtsService service = new TtsServiceImpl(client, properties(tempDir));
        when(client.synthesize(eq("你好"), any())).thenThrow(new RuntimeException("tts unavailable"));

        String filename = service.synthesize("你好");

        assertThat(filename).isNull();
        try (var files = Files.list(tempDir)) {
            assertThat(files).isEmpty();
        }
    }

    @Test
    void delete_givenStoredAudio_thenDeletesFile() throws Exception {
        TtsService service = new TtsServiceImpl(mock(EdgeTtsClient.class), properties(tempDir));
        Path audio = tempDir.resolve("recording.mp3");
        Files.write(audio, new byte[] { 1, 2, 3 });

        service.delete("recording.mp3");

        assertThat(audio).doesNotExist();
    }

    @Test
    void delete_givenEscapingPath_thenKeepsOutsideFile() throws Exception {
        TtsService service = new TtsServiceImpl(mock(EdgeTtsClient.class), properties(tempDir));
        Path outside = tempDir.getParent().resolve("outside.mp3");
        Files.write(outside, new byte[] { 1, 2, 3 });

        service.delete("../outside.mp3");

        assertThat(outside).exists();
        Files.delete(outside);
    }

    private static TtsProperties properties(Path storageDir) {
        TtsProperties properties = new TtsProperties();
        properties.setBaseUrl("http://localhost:8001");
        properties.setVoice("zh-CN-XiaoxiaoNeural");
        properties.setStorageDir(storageDir.toString());
        return properties;
    }
}
