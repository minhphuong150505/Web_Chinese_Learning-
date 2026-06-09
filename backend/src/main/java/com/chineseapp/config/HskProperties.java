package com.chineseapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Location of the HSK study materials (textbook / workbook / writing PDFs and the
 * HSK 4 listening MP3s). These are large scanned files that must NOT be bundled
 * into the JAR or committed to git, so they are served from a configurable
 * filesystem directory instead of the classpath.
 */
@ConfigurationProperties("app.hsk")
public class HskProperties {

    /**
     * Absolute or relative path to the directory that contains the HSK1..HSK4
     * sub-folders. Defaults to the repo-level {@code TaiLieu} folder, which sits
     * one level above the backend working directory during local development.
     */
    private String materialsDir = "../TaiLieu";

    public String getMaterialsDir() {
        return materialsDir;
    }

    public void setMaterialsDir(String materialsDir) {
        this.materialsDir = materialsDir;
    }
}
