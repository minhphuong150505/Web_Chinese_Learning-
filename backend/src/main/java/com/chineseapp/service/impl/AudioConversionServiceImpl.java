package com.chineseapp.service.impl;

import com.chineseapp.exception.ApiException;
import com.chineseapp.service.AudioConversionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@Service
public class AudioConversionServiceImpl implements AudioConversionService {
    private static final Logger log = LoggerFactory.getLogger(AudioConversionServiceImpl.class);

    @Override
    public File toWav16kMono(File input) {
        try {
            File output = File.createTempFile("audio-", ".wav");
            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", input.getAbsolutePath(),
                "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                output.getAbsolutePath()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(20, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion timed out");
            }
            if (process.exitValue() != 0) {
                String stderr = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                log.warn("ffmpeg failed: {}", stderr);
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion failed");
            }
            return output;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion error: " + ex.getMessage());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion error: " + ex.getMessage());
        }
    }
}
