package com.chineseapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pronunciation_scores")
public class PronunciationScore {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "reference_text", nullable = false)
    private String referenceText;

    @Column(name = "recognized_text")
    private String recognizedText;

    @Column(name = "accuracy_score", nullable = false)
    private BigDecimal accuracyScore;

    @Column(name = "fluency_score", nullable = false)
    private BigDecimal fluencyScore;

    @Column(name = "completeness_score", nullable = false)
    private BigDecimal completenessScore;

    @Column(name = "prosody_score")
    private BigDecimal prosodyScore;

    @Column(name = "pron_score", nullable = false)
    private BigDecimal pronScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "word_details", nullable = false, columnDefinition = "jsonb")
    private String wordDetailsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PronunciationScore() {
    }

    public PronunciationScore(UUID id,
                              UUID userId,
                              String referenceText,
                              String recognizedText,
                              BigDecimal accuracyScore,
                              BigDecimal fluencyScore,
                              BigDecimal completenessScore,
                              BigDecimal prosodyScore,
                              BigDecimal pronScore,
                              String wordDetailsJson,
                              Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.referenceText = referenceText;
        this.recognizedText = recognizedText;
        this.accuracyScore = accuracyScore;
        this.fluencyScore = fluencyScore;
        this.completenessScore = completenessScore;
        this.prosodyScore = prosodyScore;
        this.pronScore = pronScore;
        this.wordDetailsJson = wordDetailsJson;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getReferenceText() {
        return referenceText;
    }

    public String getRecognizedText() {
        return recognizedText;
    }

    public BigDecimal getAccuracyScore() {
        return accuracyScore;
    }

    public BigDecimal getFluencyScore() {
        return fluencyScore;
    }

    public BigDecimal getCompletenessScore() {
        return completenessScore;
    }

    public BigDecimal getProsodyScore() {
        return prosodyScore;
    }

    public BigDecimal getPronScore() {
        return pronScore;
    }

    public String getWordDetailsJson() {
        return wordDetailsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
