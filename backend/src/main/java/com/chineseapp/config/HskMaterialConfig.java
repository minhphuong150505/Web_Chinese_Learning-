package com.chineseapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves the HSK study materials (PDF books + HSK 4 listening MP3s) straight from
 * the filesystem under {@code /api/hsk/material/**}.
 *
 * <p>Spring's {@code ResourceHttpRequestHandler} handles HTTP range requests
 * automatically, which is what lets the browser page through a 35 MB PDF and seek
 * within an MP3 without downloading the whole file. The default
 * {@code PathResourceResolver} also blocks {@code ..} traversal outside the
 * configured root.
 *
 * <p>The matching path is made public in {@code SecurityConfig} because the files
 * are loaded by native {@code <iframe src>} / {@code <audio src>} tags, which
 * cannot attach the JWT Authorization header.
 */
@Configuration
public class HskMaterialConfig implements WebMvcConfigurer {

    private final HskProperties properties;

    public HskMaterialConfig(HskProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path root = Paths.get(properties.getMaterialsDir()).toAbsolutePath().normalize();
        // toUri() yields a trailing slash + proper file: scheme, required so the
        // handler treats the location as a directory rather than a single file.
        String location = root.toUri().toString();

        registry.addResourceHandler("/api/hsk/material/**")
            .addResourceLocations(location)
            .setCachePeriod(60 * 60 * 24); // 1 day; materials are immutable
    }
}
