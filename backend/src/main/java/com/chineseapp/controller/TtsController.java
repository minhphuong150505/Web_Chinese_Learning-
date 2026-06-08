package com.chineseapp.controller;

import com.chineseapp.config.TtsProperties;
import com.chineseapp.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/audio")
public class TtsController {
    private static final Pattern SAFE = Pattern.compile("^[a-f0-9-]+\\.mp3$");
    private static final String ROUTE_PREFIX = "/api/audio/";

    private final TtsProperties props;

    public TtsController(TtsProperties props) {
        this.props = props;
    }

    @GetMapping("/**")
    public ResponseEntity<Resource> get(HttpServletRequest request) {
        String filename = request.getRequestURI().substring(ROUTE_PREFIX.length());
        if (!SAFE.matcher(filename).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid filename");
        }

        Path storageDir = Path.of(props.getStorageDir()).normalize();
        Path path = storageDir.resolve(filename).normalize();
        if (!path.startsWith(storageDir)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid path");
        }
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Audio not found");
        }

        return ResponseEntity.ok()
            .contentType(MediaType.valueOf("audio/mpeg"))
            .body(new FileSystemResource(path));
    }
}
