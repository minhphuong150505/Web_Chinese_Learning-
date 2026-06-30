package com.chineseapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "title", nullable = false)
    private String title;

    // Practice language of the whole conversation ("zh", "en", …). Drives which
    // tutor prompts and TTS voice every later turn uses.
    @Column(name = "lang", nullable = false)
    private String lang;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Conversation() {
    }

    /** Backward-compatible constructor: defaults the practice language to Mandarin. */
    public Conversation(UUID id, UUID userId, String title, Instant createdAt, Instant updatedAt) {
        this(id, userId, title, "zh", createdAt, updatedAt);
    }

    public Conversation(UUID id, UUID userId, String title, String lang, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.lang = lang;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLang() {
        return lang;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
