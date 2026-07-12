package com.portfolio.controller;

import com.portfolio.model.ChatModels.ChatRequest;
import com.portfolio.model.ChatModels.ChatResponse;
import com.portfolio.model.PersonaData;
import com.portfolio.service.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * Main chat endpoint.
     * POST /api/chat
     * Body: { message: string, history: [{role, content}] }
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        if (request.message() == null || request.message().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        log.info("Received chat request: {}", request.message());
        ChatResponse response = chatService.handleChat(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Returns public persona metadata for the frontend header.
     * GET /api/persona
     */
    @GetMapping("/persona")
    public ResponseEntity<Map<String, String>> getPersona() {
        return ResponseEntity.ok(Map.of(
                "name", PersonaData.NAME,
                "initials", PersonaData.INITIALS,
                "tagline", PersonaData.TAGLINE,
                "location", PersonaData.LOCATION,
                "email", PersonaData.EMAIL,
                "github", PersonaData.GITHUB,
                "linkedin", PersonaData.LINKEDIN
        ));
    }

    /**
     * Health check endpoint.
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
