package com.portfolio.service;

import com.portfolio.model.ChatModels.*;
import com.portfolio.model.PersonaData;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClaudeService {

    private static final Logger log = LoggerFactory.getLogger(ClaudeService.class);

    private final WebClient webClient;

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.api.url}")
    private String apiUrl;

    @Value("${anthropic.model}")
    private String model;

    @Value("${openrouter.http.referer:http://localhost:5173}")
    private String httpReferer;

    public ClaudeService(WebClient webClient) {
        this.webClient = webClient;
    }

    // Fail fast at startup if API key is missing
    @PostConstruct
    public void validateConfig() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "anthropic.api.key is not set. Add it to config/local.properties: anthropic.api.key=sk-or-..."
            );
        }
        log.info("ClaudeService initialised — model: {}, url: {}", model, apiUrl);
    }

    public String chat(String userMessage, List<MessageHistory> history, String webSearchContext) {
        String systemPrompt = buildSystemPrompt(webSearchContext);
        try {
            return complete(systemPrompt, history, userMessage, 1500);
        } catch (WebClientResponseException e) {
            log.error("OpenRouter HTTP error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return "I'm having trouble connecting right now. Please try again in a moment.";
        } catch (Exception e) {
            log.error("Claude API call failed: {}", e.getMessage(), e);
            return "I'm having trouble connecting right now. Please try again in a moment.";
        }
    }

    public String classifyIntent(String message) {
        String classificationPrompt = """
                Classify this message as either "personal" or "web".

                "personal" = questions about the person's experience, projects, skills, strengths,
                             weaknesses, education, availability, contact, background, or anything
                             that would be in a personal portfolio or resume.

                "web" = general knowledge questions, tech concepts, industry trends, how-to questions,
                        factual questions about the world, or anything that would be answered by
                        searching the internet.

                Respond with ONLY one word: personal OR web. No explanation.

                Message: "%s"
                """.formatted(message);

        try {
            AnthropicRequest request = new AnthropicRequest(
                    model,
                    16,
                    List.of(
                            new AnthropicMessage("system", "You are a message classifier. Respond with only one word: personal or web."),
                            new AnthropicMessage("user", classificationPrompt)
                    )
            );

            AnthropicResponse response = post(request);

            if (response != null && response.choices() != null && !response.choices().isEmpty()) {
                AnthropicMessage msg = response.choices().get(0).message();
                if (msg != null && msg.content() != null) {
                    String result = msg.content().trim().toLowerCase();
                    log.debug("Intent classified as: '{}'", result);
                    return result.contains("web") ? "web" : "personal";
                }
            }
        } catch (WebClientResponseException e) {
            log.warn("Classification HTTP error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.warn("Intent classification failed, defaulting to personal: {}", e.getMessage());
        }

        return "personal";
    }

    private String complete(String systemPrompt, List<MessageHistory> history,
                            String userMessage, int maxTokens) {
        List<AnthropicMessage> messages = buildMessageHistory(systemPrompt, history, userMessage);
        AnthropicRequest request = new AnthropicRequest(model, maxTokens, messages);
        AnthropicResponse response = post(request);

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            log.error("Empty/null response body from OpenRouter");
            return "Sorry, I couldn't generate a response. Please try again.";
        }

        return response.choices().stream()
                .filter(c -> c.message() != null && c.message().content() != null)
                .map(c -> c.message().content())
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(" "));
    }

    private AnthropicResponse post(AnthropicRequest request) {
        return webClient.post()
                .uri(apiUrl)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .header("HTTP-Referer", httpReferer)
                .header("X-Title", "AI Portfolio")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(AnthropicResponse.class)
                .block();
    }

    private List<AnthropicMessage> buildMessageHistory(String systemPrompt,
                                                       List<MessageHistory> history,
                                                       String currentMessage) {
        List<AnthropicMessage> messages = new ArrayList<>();
        messages.add(new AnthropicMessage("system", systemPrompt));
        history.forEach(h -> messages.add(new AnthropicMessage(h.role(), h.content())));
        messages.add(new AnthropicMessage("user", currentMessage));
        return messages;
    }

    private String buildSystemPrompt(String webContext) {
        String base = PersonaData.buildSystemPrompt();
        if (webContext != null && !webContext.isBlank()) {
            return base + "\n\n" + webContext +
                    "\n\nFor this question, use the web search results above. " +
                    "Explain in simple language and cite your sources at the end.";
        }
        return base;
    }
}