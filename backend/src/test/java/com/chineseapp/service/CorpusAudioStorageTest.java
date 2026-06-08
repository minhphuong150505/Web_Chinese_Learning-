package com.chineseapp.service;

import com.chineseapp.config.CorpusProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CorpusAudioStorageTest {

    private CorpusProperties props(Path dir, boolean enabled) {
        CorpusProperties p = new CorpusProperties();
        p.setEnabled(enabled);
        p.setStorageDir(dir.toString());
        p.setRetentionDays(90);
        return p;
    }

    private File wavWith(Path dir, byte[] bytes) throws Exception {
        File wav = Files.createTempFile(dir, "src-", ".wav").toFile();
        Files.write(wav.toPath(), bytes);
        return wav;
    }

    @Test
    void storeIfConsented_whenEnabledAndConsented_copiesWavAndReturnsRelativePath(@TempDir Path tmp) throws Exception {
        Path store = tmp.resolve("store");
        CorpusAudioStorage storage = new CorpusAudioStorage(props(store, true));
        UUID id = UUID.randomUUID();
        File wav = wavWith(tmp, new byte[]{1, 2, 3, 4});

        Optional<String> rel = storage.storeIfConsented(id, wav, true);

        assertThat(rel).isPresent();
        assertThat(rel.get()).endsWith(id + ".wav");
        Path stored = store.resolve(rel.get());
        assertThat(Files.exists(stored)).isTrue();
        assertThat(Files.readAllBytes(stored)).containsExactly(1, 2, 3, 4);
    }

    @Test
    void storeIfConsented_whenNotConsented_storesNothing(@TempDir Path tmp) throws Exception {
        CorpusAudioStorage storage = new CorpusAudioStorage(props(tmp.resolve("store"), true));
        File wav = wavWith(tmp, new byte[]{1});

        assertThat(storage.storeIfConsented(UUID.randomUUID(), wav, false)).isEmpty();
    }

    @Test
    void storeIfConsented_whenCollectionDisabled_storesNothingEvenWithConsent(@TempDir Path tmp) throws Exception {
        CorpusAudioStorage storage = new CorpusAudioStorage(props(tmp.resolve("store"), false));
        File wav = wavWith(tmp, new byte[]{1});

        assertThat(storage.storeIfConsented(UUID.randomUUID(), wav, true)).isEmpty();
    }

    @Test
    void delete_removesStoredClip(@TempDir Path tmp) throws Exception {
        Path store = tmp.resolve("store");
        CorpusAudioStorage storage = new CorpusAudioStorage(props(store, true));
        Optional<String> rel = storage.storeIfConsented(UUID.randomUUID(), wavWith(tmp, new byte[]{9}), true);
        assertThat(rel).isPresent();

        storage.delete(rel.get());

        assertThat(Files.exists(store.resolve(rel.get()))).isFalse();
    }

    @Test
    void delete_refusesPathTraversalOutsideBase(@TempDir Path tmp) throws Exception {
        Path store = tmp.resolve("store");
        Files.createDirectories(store);
        CorpusAudioStorage storage = new CorpusAudioStorage(props(store, true));
        // A secret file living next to (but outside) the corpus base.
        Path outside = tmp.resolve("secret.txt");
        Files.writeString(outside, "keep me", StandardCharsets.UTF_8);

        storage.delete("../secret.txt");

        assertThat(Files.exists(outside)).isTrue();
    }

    @Test
    void retentionUntil_addsConfiguredDays(@TempDir Path tmp) {
        CorpusAudioStorage storage = new CorpusAudioStorage(props(tmp, true));
        Instant from = Instant.parse("2026-06-08T00:00:00Z");

        assertThat(storage.retentionUntil(from)).isEqualTo(Instant.parse("2026-09-06T00:00:00Z"));
    }
}
