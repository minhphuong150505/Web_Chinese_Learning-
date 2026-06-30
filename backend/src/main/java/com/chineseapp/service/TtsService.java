package com.chineseapp.service;

public interface TtsService {
    String synthesize(String text);

    String synthesize(String text, String lang);

    void delete(String audioPath);
}
