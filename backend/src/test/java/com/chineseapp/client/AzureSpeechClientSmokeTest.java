package com.chineseapp.client;

import com.chineseapp.config.AzureSpeechProperties;
import com.microsoft.cognitiveservices.speech.ResultReason;
import com.microsoft.cognitiveservices.speech.SpeechConfig;
import com.microsoft.cognitiveservices.speech.SpeechSynthesisOutputFormat;
import com.microsoft.cognitiveservices.speech.SpeechSynthesisResult;
import com.microsoft.cognitiveservices.speech.SpeechSynthesizer;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "AZURE_SPEECH_KEY", matches = ".+")
@EnabledIfEnvironmentVariable(named = "AZURE_SPEECH_REGION", matches = ".+")
class AzureSpeechClientSmokeTest {
    private static final String REFERENCE_TEXT = "你好，我喜欢学习中文。";

    @TempDir
    private Path tempDir;

    @Test
    void assess_givenMandarinWav_thenReturnsDetailedJson() throws Exception {
        AzureSpeechProperties props = propertiesFromEnv();
        File wav = synthesizeMandarinFixture(props);
        AzureSpeechClient client = new AzureSpeechClient(props);

        AzureSpeechClient.AssessmentRawResult result = client.assess(wav, REFERENCE_TEXT);

        assertThat(result).isNotNull();
        assertThat(result.detailedJson()).isNotBlank();
        assertThat(result.recognizedText()).isNotBlank();
    }

    private File synthesizeMandarinFixture(AzureSpeechProperties props) throws Exception {
        File wav = tempDir.resolve("mandarin-reference.wav").toFile();
        try (SpeechConfig speechConfig = SpeechConfig.fromSubscription(props.getKey(), props.getRegion());
             AudioConfig audioConfig = AudioConfig.fromWavFileOutput(wav.getAbsolutePath());
             SpeechSynthesizer synthesizer = new SpeechSynthesizer(speechConfig, audioConfig)) {

            speechConfig.setSpeechSynthesisLanguage(props.getLanguage());
            speechConfig.setSpeechSynthesisVoiceName("zh-CN-XiaoxiaoNeural");
            speechConfig.setSpeechSynthesisOutputFormat(SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm);

            SpeechSynthesisResult result = synthesizer.SpeakTextAsync(REFERENCE_TEXT)
                .get(30, TimeUnit.SECONDS);
            assertThat(result.getReason()).isEqualTo(ResultReason.SynthesizingAudioCompleted);
        }

        assertThat(wav).exists();
        assertThat(wav.length()).isGreaterThan(44);
        return wav;
    }

    private AzureSpeechProperties propertiesFromEnv() {
        AzureSpeechProperties props = new AzureSpeechProperties();
        props.setKey(System.getenv("AZURE_SPEECH_KEY"));
        props.setRegion(System.getenv("AZURE_SPEECH_REGION"));
        props.setLanguage("zh-CN");
        return props;
    }
}
