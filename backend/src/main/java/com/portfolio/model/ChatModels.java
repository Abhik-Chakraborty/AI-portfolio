package com.portfolio.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class ChatModels {

    // ─── Incoming request from frontend ───────────────────────
    public record ChatRequest(
            String message,
            List<MessageHistory> history
    ) {}

    public record MessageHistory(
            String role,   // "user" or "assistant"
            String content
    ) {}

    // ─── Outgoing response to frontend ────────────────────────
    public record ChatResponse(
            String reply,
            String type,             // "personal" | "web" | "mixed"
            List<SearchResult> sources
    ) {}

    public record SearchResult(
            String title,
            String snippet,
            String url
    ) {}

    // ─── DuckDuckGo Instant Answer API response ────────────────
    public record DuckDuckGoResponse(
            @JsonProperty("Heading") String heading,
            @JsonProperty("AbstractText") String abstractText,
            @JsonProperty("AbstractURL") String abstractUrl,
            @JsonProperty("Answer") String answer,
            @JsonProperty("Definition") String definition,
            @JsonProperty("DefinitionURL") String definitionUrl,
            @JsonProperty("RelatedTopics") List<DuckDuckGoRelatedTopic> relatedTopics
    ) {}

    public record DuckDuckGoRelatedTopic(
            @JsonProperty("Text") String text,
            @JsonProperty("FirstURL") String firstUrl
    ) {}

    // ─── OpenRouter (OpenAI-compatible) API request/response ──
    public record AnthropicRequest(
            String model,
            int max_tokens,
            String reasoning_effort,   // keeps Gemini's "thinking" tokens from eating the whole budget
            List<AnthropicMessage> messages   // system prompt is a message with role "system"
    ) {}

    public record AnthropicMessage(
            String role,    // "system" | "user" | "assistant"
            String content
    ) {}

    public record AnthropicResponse(
            List<OpenRouterChoice> choices
    ) {}

    public record OpenRouterChoice(
            AnthropicMessage message
    ) {}
}