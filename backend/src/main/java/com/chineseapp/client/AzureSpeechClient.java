package com.chineseapp.client;

import com.chineseapp.config.AzureSpeechProperties;
import com.chineseapp.exception.ApiException;
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentConfig;
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentGranularity;
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentGradingSystem;
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentResult;
import com.microsoft.cognitiveservices.speech.PropertyId;
import com.microsoft.cognitiveservices.speech.SpeechConfig;
import com.microsoft.cognitiveservices.speech.SpeechRecognitionResult;
import com.microsoft.cognitiveservices.speech.SpeechRecognizer;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.File;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
public class AzureSpeechClient {
    private final AzureSpeechProperties props;

    public AzureSpeechClient(AzureSpeechProperties props) {
        this.props = props;
    }

    public AssessmentRawResult assess(File wav, String referenceText) {
        if (!StringUtils.hasText(props.getKey()) || !StringUtils.hasText(props.getRegion())) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure Speech is not configured");
        }

        try (SpeechConfig speechConfig = SpeechConfig.fromSubscription(props.getKey(), props.getRegion());
             AudioConfig audioConfig = AudioConfig.fromWavFileInput(wav.getAbsolutePath());
             SpeechRecognizer recognizer = new SpeechRecognizer(speechConfig, props.getLanguage(), audioConfig);
             PronunciationAssessmentConfig assessmentConfig = new PronunciationAssessmentConfig(
                 referenceText,
                 PronunciationAssessmentGradingSystem.HundredMark,
                 PronunciationAssessmentGranularity.Phoneme,
                 true)) {

            assessmentConfig.enableProsodyAssessment();
            assessmentConfig.applyTo(recognizer);

            SpeechRecognitionResult result = recognizer.recognizeOnceAsync().get(30, TimeUnit.SECONDS);
            PronunciationAssessmentResult assessmentResult = PronunciationAssessmentResult.fromResult(result);
            String detailedJson = result.getProperties()
                .getProperty(PropertyId.SpeechServiceResponse_JsonResult);

            return new AssessmentRawResult(
                result.getText(),
                assessmentResult.getAccuracyScore(),
                assessmentResult.getFluencyScore(),
                assessmentResult.getCompletenessScore(),
                assessmentResult.getProsodyScore(),
                assessmentResult.getPronunciationScore(),
                detailedJson
            );
        } catch (TimeoutException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "Azure Speech timed out");
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure Speech failed: " + ex.getMessage());
        }
    }

    public record AssessmentRawResult(
        String recognizedText,
        double accuracy,
        double fluency,
        double completeness,
        Double prosody,
        double pron,
        String detailedJson
    ) {
    }
}
