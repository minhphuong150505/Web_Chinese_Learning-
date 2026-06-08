package com.chineseapp.service;

import java.io.File;

public interface AudioConversionService {
    File toWav16kMono(File input);
}
