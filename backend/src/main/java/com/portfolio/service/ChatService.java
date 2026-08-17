package com.portfolio.service;

import com.portfolio.model.ChatModels.*;
import com.portfolio.model.PersonaData;
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
    private final PersonaRetrievalService personaRetrievalService;

    public ChatService(ClaudeService claudeService, GoogleSearchService googleSearchService,
                        PersonaRetrievalService personaRetrievalService) {
        this.claudeService = claudeService;
        this.googleSearchService = googleSearchService;
        this.personaRetrievalService = personaRetrievalService;
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

        // 2. Build the appropriate context block for the intent
        List<SearchResult> sources = Collections.emptyList();
        String contextBlock;

        if ("web".equals(intent)) {
            sources = googleSearchService.search(message);
            if (!sources.isEmpty()) {
                contextBlock = googleSearchService.formatResultsForPrompt(sources);
                log.debug("Found {} web search results", sources.size());
            } else {
                log.debug("No web results found, falling back to persona knowledge");
                contextBlock = null;
            }
        } else {
            List<PersonaData.Chunk> chunks = personaRetrievalService.retrieve(message, 5);
            if (chunks.isEmpty()) {
                chunks = personaRetrievalService.defaultChunks();
            }
            contextBlock = personaRetrievalService.formatForPrompt(chunks);
            log.debug("Retrieved {} persona chunks for query", chunks.size());
        }

        // 3. Call Claude with the retrieved/searched context
        String reply = claudeService.chat(message, history, contextBlock);

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
