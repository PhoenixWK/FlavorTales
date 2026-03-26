package com.flavortales.audio.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.audio")
public class AudioProperties {

    private GoogleTts googleTts = new GoogleTts();
    private ViTts viTts = new ViTts();
    private ZhTts zhTts = new ZhTts();
    private KoTts koTts = new KoTts();
    private RuTts ruTts = new RuTts();
    private JaTts jaTts = new JaTts();
    private GoogleTranslate googleTranslate = new GoogleTranslate();
    @Data
    public static class KoTts {
        /** Uses the same Google Cloud TTS endpoint/key as English. */
        private String languageCode = "ko-KR";
        private String voiceName = "ko-KR-Wavenet-A";
    }

    @Data
    public static class RuTts {
        /** Uses the same Google Cloud TTS endpoint/key as English. */
        private String languageCode = "ru-RU";
        private String voiceName = "ru-RU-Wavenet-A";
    }

    @Data
    public static class JaTts {
        /** Uses the same Google Cloud TTS endpoint/key as English. */
        private String languageCode = "ja-JP";
        private String voiceName = "ja-JP-Wavenet-B";
    }

    @Data
    public static class GoogleTts {
        private String apiKey;
        private String endpoint;
        private String voiceName = "en-US-Wavenet-D";
        private String languageCode = "en-US";
    }

    @Data
    public static class ViTts {
        /** Uses the same Google Cloud TTS endpoint/key as English. */
        private String languageCode = "vi-VN";
        private String voiceName = "vi-VN-Standard-A";
    }

    @Data
    public static class ZhTts {
        /** Uses the same Google Cloud TTS endpoint/key as English. */
        private String languageCode = "zh-CN";
        private String voiceName = "cmn-CN-Wavenet-A";
    }

    @Data
    public static class GoogleTranslate {
        private String apiKey;
        private String endpoint = "https://translation.googleapis.com/language/translate/v2";
    }
}
