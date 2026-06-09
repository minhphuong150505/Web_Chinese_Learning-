package com.chineseapp.service;

public interface TtsService {
    String synthesize(String text);

    void delete(String audioPath);
}
