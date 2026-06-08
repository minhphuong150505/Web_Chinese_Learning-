package com.chineseapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Round 26 Phase 0 tone-corpus collection. Off by default: storing learner voice
 * requires explicit per-attempt consent <em>and</em> the operator enabling this
 * switch (so a deployment can't silently start retaining audio).
 */
@ConfigurationProperties("app.corpus")
public class CorpusProperties {

    /** Master switch. When false, no audio is stored regardless of consent. */
    private boolean enabled = false;

    /** Directory the consented WAVs are written under. */
    private String storageDir = "/data/corpus";

    /** Days a clip is kept before the retention sweep deletes it. */
    private int retentionDays = 90;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getStorageDir() {
        return storageDir;
    }

    public void setStorageDir(String storageDir) {
        this.storageDir = storageDir;
    }

    public int getRetentionDays() {
        return retentionDays;
    }

    public void setRetentionDays(int retentionDays) {
        this.retentionDays = retentionDays;
    }
}
