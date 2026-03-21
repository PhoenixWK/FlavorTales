package com.flavortales.audio.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.audio")
public class AudioProperties {

    private FptAi fptAi = new FptAi();
    private GoogleTts googleTts = new GoogleTts();

    @Data
    public static class FptAi {
        private String apiKey;
        private String endpoint;
        private String voice = "banmai";
        private int speed = 0;
    }

    @Data
    public static class GoogleTts {
        private String apiKey;
        private String endpoint;
        private String voiceName = "en-US-Wavenet-D";
        private String languageCode = "en-US";
    }

    @Data
    public static class ZhTts {
        /** Uses the same Google Cloud TTS endpoint/key as English. */
        private String languageCode = "zh-CN";
        private String voiceName = "cmn-CN-Wavenet-A";
    }

    private ZhTts zhTts = new ZhTts();
}
