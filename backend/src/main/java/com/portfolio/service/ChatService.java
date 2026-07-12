package com.portfolio.service;

import com.portfolio.model.ChatModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ClaudeService claudeService;
    private final GoogleSearchService googleSearchService;

    public ChatService(ClaudeService claudeService, GoogleSearchService googleSearchService) {
        this.claudeService = claudeService;
        this.googleSearchService = googleSearchService;
    }

    /**
     * Main chat handler. Classifies intent, optionally searches web,
     * then calls Claude with appropriate context.
     */
    public ChatResponse handleChat(ChatRequest request) {
        String message = request.message();
        List<MessageHistory> history = request.history() != null ? request.history() : Collections.emptyList();

        log.debug("Handling chat message: {}", message);

        // 1. Classify intent
        String intent = claudeService.classifyIntent(message);
        log.debug("Intent classified as: {}", intent);

        // 2. If web question, fetch search results
        List<SearchResult> sources = Collections.emptyList();
        String webContext = null;

        if ("web".equals(intent)) {
            sources = googleSearchService.search(message);
            if (!sources.isEmpty()) {
                webContext = googleSearchService.formatResultsForPrompt(sources);
                log.debug("Found {} web search results", sources.size());
            } else {
                log.debug("No web results found, falling back to persona knowledge");
            }
        }

        // 3. Call Claude with appropriate context
        String reply = claudeService.chat(message, history, webContext);

        // 4. Determine response type
        String type = "personal";
        if ("web".equals(intent) && !sources.isEmpty()) {
            type = "web";
        } else if ("web".equals(intent)) {
            type = "mixed"; // web intent but no results — Claude uses its own knowledge
        }

        return new ChatResponse(reply, type, sources);
    }
}
