package com.chineseapp.service;

import com.chineseapp.dto.translation.TranslationRequest;
import com.chineseapp.dto.translation.TranslationResponse;

public interface TranslationService {
    TranslationResponse translate(TranslationRequest req);
}
