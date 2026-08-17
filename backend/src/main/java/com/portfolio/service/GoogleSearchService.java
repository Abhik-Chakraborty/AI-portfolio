package com.portfolio.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.model.ChatModels.DuckDuckGoRelatedTopic;
import com.portfolio.model.ChatModels.DuckDuckGoResponse;
import com.portfolio.model.ChatModels.SearchResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Web search via DuckDuckGo's Instant Answer API — free, no API key, no signup.
 * Returns abstracts/definitions/related-topic blurbs rather than full web results,
 * so coverage is strongest for well-known topics (companies, concepts, people) and
 * weaker for long-tail or how-to questions.
 */
@Service
public class GoogleSearchService {

    private static final Logger log = LoggerFactory.getLogger(GoogleSearchService.class);
    private static final int MAX_RESULTS = 4;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${duckduckgo.search.url}")
    private String searchUrl;

    public GoogleSearchService(WebClient webClient, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    public List<SearchResult> search(String query) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(searchUrl)
                    .queryParam("q", query)
                    .queryParam("format", "json")
                    .queryParam("no_html", "1")
                    .queryParam("skip_disambig", "1")
                    .build()
                    .toUri();

            // DuckDuckGo serves this as "application/x-javascript" rather than "application/json",
            // so fetch as raw text and parse manually instead of relying on content-type-based decoding.
            String body = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (body == null || body.isBlank()) {
                log.warn("DuckDuckGo returned no response for query: '{}'", query);
                return Collections.emptyList();
            }

            DuckDuckGoResponse response = objectMapper.readValue(body, DuckDuckGoResponse.class);

            List<SearchResult> results = new ArrayList<>();

            if (isPresent(response.abstractText())) {
                String title = isPresent(response.heading()) ? response.heading() : query;
                results.add(new SearchResult(title, response.abstractText(), response.abstractUrl()));
            }

            if (isPresent(response.answer())) {
                results.add(new SearchResult("Answer", response.answer(), response.abstractUrl()));
            }

            if (isPresent(response.definition())) {
                results.add(new SearchResult("Definition", response.definition(), response.definitionUrl()));
            }

            if (response.relatedTopics() != null) {
                for (DuckDuckGoRelatedTopic topic : response.relatedTopics()) {
                    if (results.size() >= MAX_RESULTS) break;
                    if (isPresent(topic.text())) {
                        results.add(new SearchResult(topic.text(), topic.text(), topic.firstUrl()));
                    }
                }
            }

            if (results.isEmpty()) {
                log.warn("DuckDuckGo returned no usable results for query: '{}'", query);
            }

            return results;

        } catch (WebClientResponseException e) {
            log.error("DuckDuckGo Search HTTP error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("DuckDuckGo Search failed for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    private boolean isPresent(String s) {
        return s != null && !s.isBlank();
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
