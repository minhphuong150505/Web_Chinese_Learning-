package com.chineseapp.service;

import com.chineseapp.service.impl.AudioConversionServiceImpl;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class AudioConversionServiceImplTest {

    @TempDir
    private Path tempDir;

    @Test
    void toWav16kMono_givenWebmInput_thenWritesPcmWav() throws Exception {
        Assumptions.assumeTrue(commandAvailable("ffmpeg"), "ffmpeg is not installed; skipping conversion test");
        Path sample = tempDir.resolve("sample.webm");
        generateSilentWebm(sample);
        AudioConversionService service = new AudioConversionServiceImpl();

        File wav = service.toWav16kMono(sample.toFile());

        assertThat(wav).exists().isFile();
        byte[] header = Files.readAllBytes(wav.toPath());
        assertThat(header.length).isGreaterThan(44);
        assertThat(new String(header, 0, 4)).isEqualTo("RIFF");
        assertThat(new String(header, 8, 4)).isEqualTo("WAVE");
        assertThat(leShort(header, 20)).isEqualTo(1);
        assertThat(leShort(header, 22)).isEqualTo(1);
        assertThat(leInt(header, 24)).isEqualTo(16000);
        assertThat(leShort(header, 34)).isEqualTo(16);
    }

    private static void generateSilentWebm(Path output) throws Exception {
        Process process = new ProcessBuilder(
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi",
            "-i", "anullsrc=channel_layout=mono:sample_rate=48000",
            "-t", "0.5",
            "-c:a", "libopus",
            output.toString()
        ).redirectErrorStream(true).start();
        boolean finished = process.waitFor(20, TimeUnit.SECONDS);
        assertThat(finished).isTrue();
        assertThat(process.exitValue()).isEqualTo(0);
        assertThat(output).exists().isRegularFile();
    }

    private static boolean commandAvailable(String command) throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command, "-version")
            .redirectErrorStream(true)
            .start();
        boolean finished = process.waitFor(5, TimeUnit.SECONDS);
        return finished && process.exitValue() == 0;
    }

    private static int leInt(byte[] bytes, int offset) {
        return ByteBuffer.wrap(bytes, offset, Integer.BYTES)
            .order(ByteOrder.LITTLE_ENDIAN)
            .getInt();
    }

    private static int leShort(byte[] bytes, int offset) {
        return Short.toUnsignedInt(ByteBuffer.wrap(bytes, offset, Short.BYTES)
            .order(ByteOrder.LITTLE_ENDIAN)
            .getShort());
    }
}
