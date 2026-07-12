package com.portfolio.service;

import com.portfolio.model.ChatModels.GoogleSearchResponse;
import com.portfolio.model.ChatModels.SearchResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GoogleSearchService {

    private static final Logger log = LoggerFactory.getLogger(GoogleSearchService.class);

    private final WebClient webClient;

    @Value("${google.search.api.key}")
    private String apiKey;

    @Value("${google.search.engine.id}")
    private String searchEngineId;

    @Value("${google.search.url}")
    private String searchUrl;

    public GoogleSearchService(WebClient webClient) {
        this.webClient = webClient;
    }

    public List<SearchResult> search(String query) {
        try {
            // Use the configured searchUrl property instead of hardcoding
            URI uri = UriComponentsBuilder.fromHttpUrl(searchUrl)
                    .queryParam("key", apiKey)
                    .queryParam("cx", searchEngineId)
                    .queryParam("q", query)
                    .queryParam("num", 4)
                    .build()
                    .toUri();

            GoogleSearchResponse response = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(GoogleSearchResponse.class)
                    .block();

            if (response == null || response.items() == null) {
                log.warn("Google Search returned no items for query: '{}'", query);
                return Collections.emptyList();
            }

            return response.items().stream()
                    .map(item -> new SearchResult(item.title(), item.snippet(), item.link()))
                    .collect(Collectors.toList());

        } catch (WebClientResponseException e) {
            log.error("Google Search HTTP error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Google Search failed for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    public String formatResultsForPrompt(List<SearchResult> results) {
        if (results.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        sb.append("=== WEB SEARCH RESULTS ===\n");
        sb.append("Use these to answer the question. Rephrase in simple language. Cite sources.\n\n");

        for (int i = 0; i < results.size(); i++) {
            SearchResult r = results.get(i);
            sb.append("[Source %d] %s\n".formatted(i + 1, r.title()));
            sb.append("URL: %s\n".formatted(r.url()));
            sb.append("Info: %s\n\n".formatted(r.snippet()));
        }

        sb.append("""
                INSTRUCTIONS:
                - Summarize the above in simple, easy-to-understand language
                - Mention which source(s) you used at the end (e.g. "Source: [title] - [url]")
                - Do NOT copy-paste text verbatim — always rephrase
                """);

        return sb.toString();
    }
}