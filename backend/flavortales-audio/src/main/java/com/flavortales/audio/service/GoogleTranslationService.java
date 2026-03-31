package com.flavortales.audio.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Delegates to {@link com.flavortales.common.service.GoogleTranslationService}.
 * Kept so existing audio module code compiles without change.
 */
@Service("audioGoogleTranslationService")
@RequiredArgsConstructor
public class GoogleTranslationService {

    private final com.flavortales.common.service.GoogleTranslationService delegate;

    public String translate(String text, String sourceLang, String targetLang) {
        return delegate.translate(text, sourceLang, targetLang);
    }
}
