package com.portfolio.model;

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

    // ─── Google Custom Search API response ────────────────────
    public record GoogleSearchResponse(
            List<GoogleSearchItem> items
    ) {}

    public record GoogleSearchItem(
            String title,
            String snippet,
            String link
    ) {}

    // ─── OpenRouter (OpenAI-compatible) API request/response ──
    public record AnthropicRequest(
            String model,
            int max_tokens,
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