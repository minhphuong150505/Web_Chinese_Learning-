package com.chineseapp.controller;

import com.chineseapp.dto.chat.ChatRequest;
import com.chineseapp.dto.chat.ChatResponse;
import com.chineseapp.dto.chat.ConversationDto;
import com.chineseapp.dto.chat.MessageDto;
import com.chineseapp.dto.chat.VoiceTurnResponse;
import com.chineseapp.exception.ApiException;
import com.chineseapp.security.CurrentUser;
import com.chineseapp.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
@Validated
public class ConversationController {

    private final ConversationService service;

    public ConversationController(ConversationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ConversationDto> create(@AuthenticationPrincipal CurrentUser user) {
        return ResponseEntity.ok(service.createConversation(user.id()));
    }

    @GetMapping
    public ResponseEntity<List<ConversationDto>> list(@AuthenticationPrincipal CurrentUser user) {
        return ResponseEntity.ok(service.listConversations(user.id()));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageDto>> messages(@AuthenticationPrincipal CurrentUser user,
                                                     @PathVariable UUID id) {
        return ResponseEntity.ok(service.listMessages(user.id(), id));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ChatResponse> send(@AuthenticationPrincipal CurrentUser user,
                                             @PathVariable UUID id,
                                             @Valid @RequestBody ChatRequest req) {
        return ResponseEntity.ok(service.sendMessage(user.id(), id, req.content()));
    }

    @PostMapping(value = "/{id}/voice-turn", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VoiceTurnResponse> voiceTurn(@AuthenticationPrincipal CurrentUser user,
                                                       @PathVariable UUID id,
                                                       @RequestParam("audio") MultipartFile audio) {
        if (audio.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Empty audio");
        }
        return ResponseEntity.ok(service.sendVoiceTurn(user.id(), id, audio));
    }
}
