package com.portfolio.service;

import com.portfolio.model.PersonaData.Chunk;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PersonaRetrievalServiceTest {

    private PersonaRetrievalService service;

    @BeforeEach
    void setUp() {
        service = new PersonaRetrievalService();
        service.buildIndex();
    }

    @Test
    void retrievesRelationshipChunkForGirlfriendQuestion() {
        List<Chunk> results = service.retrieve("Do you have a girlfriend?", 5);

        assertThat(results).isNotEmpty();
        assertThat(results.get(0).id()).isEqualTo("relationship");
        assertThat(results).noneMatch(c -> c.id().startsWith("work-"));
    }

    @Test
    void retrievesWorkHistoryChunkForCompanyQuestion() {
        List<Chunk> results = service.retrieve("What did you do at Salesforce?", 5);

        assertThat(results).isNotEmpty();
        assertThat(results).anyMatch(c -> c.category().equals("Work History") && c.text().contains("Salesforce"));
    }

    @Test
    void returnsEmptyForBlankQuery() {
        assertThat(service.retrieve("", 5)).isEmpty();
        assertThat(service.retrieve(null, 5)).isEmpty();
    }

    @Test
    void defaultChunksIncludeBioAndContact() {
        List<Chunk> defaults = service.defaultChunks();

        assertThat(defaults).extracting(Chunk::id).containsExactly("bio", "contact");
    }

    @Test
    void formatForPromptGroupsByCategory() {
        List<Chunk> chunks = service.retrieve("Salesforce", 3);
        String formatted = service.formatForPrompt(chunks);

        assertThat(formatted).contains("=== RELEVANT CONTEXT ABOUT ME ===");
        assertThat(formatted).contains("[Work History]");
    }
}
