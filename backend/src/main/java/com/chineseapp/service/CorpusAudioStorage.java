package com.chineseapp.service;

import com.chineseapp.config.CorpusProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * Round 26 Phase 0: persists consented learner recordings so a labelled Mandarin
 * tone corpus can be built. Best-effort by design — a storage failure must never
 * break the scoring response the learner is waiting on, so every path degrades to
 * "not stored" rather than throwing.
 */
@Service
public class CorpusAudioStorage {

    private static final Logger log = LoggerFactory.getLogger(CorpusAudioStorage.class);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneOffset.UTC);

    private final CorpusProperties props;

    public CorpusAudioStorage(CorpusProperties props) {
        this.props = props;
    }

    /**
     * Copies the assessed WAV into the corpus when collection is enabled and the
     * learner consented. Returns the stored relative path (to persist on the row),
     * or empty when nothing was stored.
     */
    public Optional<String> storeIfConsented(UUID scoreId, File wav, boolean consent) {
        if (!props.isEnabled() || !consent || wav == null || !wav.exists()) {
            return Optional.empty();
        }
        // Shard by month so directories stay browsable; key by score id so each
        // clip joins back to its Azure syllables + pinyin labels.
        String relative = MONTH.format(Instant.now()) + "/" + scoreId + ".wav";
        try {
            Path base = Path.of(props.getStorageDir()).toAbsolutePath().normalize();
            Path target = base.resolve(relative).normalize();
            Files.createDirectories(target.getParent());
            Files.copy(wav.toPath(), target, StandardCopyOption.REPLACE_EXISTING);
            return Optional.of(relative);
        } catch (IOException ex) {
            log.warn("Corpus audio store failed for {} ({}); continuing without it", scoreId, ex.getMessage());
            return Optional.empty();
        }
    }

    /** Deletes a stored clip during retention sweeps; guards against path escape. */
    public void delete(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        Path base = Path.of(props.getStorageDir()).toAbsolutePath().normalize();
        Path target = base.resolve(relativePath).normalize();
        if (!target.startsWith(base)) {
            log.warn("Refusing to delete corpus path outside base: {}", relativePath);
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ex) {
            log.warn("Corpus audio delete failed for {} ({})", relativePath, ex.getMessage());
        }
    }

    /** When a stored clip should be purged, given today. */
    public Instant retentionUntil(Instant from) {
        return from.plus(java.time.Duration.ofDays(props.getRetentionDays()));
    }
}
