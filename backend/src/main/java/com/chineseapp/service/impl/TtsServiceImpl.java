package com.chineseapp.service.impl;

import com.chineseapp.client.EdgeTtsClient;
import com.chineseapp.config.TtsProperties;
import com.chineseapp.service.TtsService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class TtsServiceImpl implements TtsService {
    private static final Logger log = LoggerFactory.getLogger(TtsServiceImpl.class);

    private final EdgeTtsClient client;
    private final TtsProperties props;

    public TtsServiceImpl(EdgeTtsClient client, TtsProperties props) {
        this.client = client;
        this.props = props;
    }

    @PostConstruct
    void init() {
        try {
            Files.createDirectories(Path.of(props.getStorageDir()));
        } catch (Exception ex) {
            log.warn("Could not create TTS storage directory {}", props.getStorageDir(), ex);
        }
    }

    @Override
    public String synthesize(String text) {
        try {
            byte[] bytes = client.synthesize(text);
            String filename = UUID.randomUUID() + ".mp3";
            Files.write(Path.of(props.getStorageDir(), filename), bytes);
            return filename;
        } catch (Exception ex) {
            log.warn("TTS synthesis failed for text length {}", text.length(), ex);
            return null;
        }
    }
}
