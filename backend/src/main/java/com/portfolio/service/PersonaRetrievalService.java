package com.portfolio.service;

import com.portfolio.model.PersonaData;
import com.portfolio.model.PersonaData.Chunk;
import jakarta.annotation.PostConstruct;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.ByteBuffersDirectory;
import org.apache.lucene.store.Directory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Retrieval half of the RAG pipeline for "personal" chat questions: indexes PersonaData.chunks()
 * with Lucene (BM25 by default) and returns only the chunks relevant to a given question, instead
 * of dumping the entire persona into every prompt.
 */
@Service
public class PersonaRetrievalService {

    private static final Logger log = LoggerFactory.getLogger(PersonaRetrievalService.class);
    private static final String FIELD_TEXT = "text";
    private static final String FIELD_ID = "id";
    private static final String FIELD_CATEGORY = "category";

    private final StandardAnalyzer analyzer = new StandardAnalyzer();
    private final Map<String, Chunk> chunksById = new LinkedHashMap<>();
    private IndexSearcher searcher;

    @PostConstruct
    public void buildIndex() {
        List<Chunk> chunks = PersonaData.chunks();
        chunks.forEach(c -> chunksById.put(c.id(), c));

        try {
            Directory directory = new ByteBuffersDirectory();
            IndexWriterConfig config = new IndexWriterConfig(analyzer);
            try (IndexWriter writer = new IndexWriter(directory, config)) {
                for (Chunk chunk : chunks) {
                    Document doc = new Document();
                    doc.add(new StringField(FIELD_ID, chunk.id(), Field.Store.YES));
                    doc.add(new StringField(FIELD_CATEGORY, chunk.category(), Field.Store.YES));
                    doc.add(new TextField(FIELD_TEXT, chunk.text(), Field.Store.YES));
                    writer.addDocument(doc);
                }
            }
            IndexReader reader = DirectoryReader.open(directory);
            this.searcher = new IndexSearcher(reader);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to build persona retrieval index", e);
        }

        log.info("PersonaRetrievalService indexed {} chunks", chunks.size());
    }

    /**
     * Returns the top-K chunks most relevant to the query, ranked by BM25 score.
     * Returns an empty list if nothing scores above zero (e.g. a bare greeting) —
     * callers should fall back to defaultChunks() in that case.
     */
    public List<Chunk> retrieve(String query, int topK) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        try {
            Query luceneQuery = new QueryParser(FIELD_TEXT, analyzer).parse(QueryParser.escape(query));
            TopDocs topDocs = searcher.search(luceneQuery, topK);

            List<Chunk> results = new ArrayList<>();
            for (ScoreDoc scoreDoc : topDocs.scoreDocs) {
                String id = searcher.storedFields().document(scoreDoc.doc).get(FIELD_ID);
                Chunk chunk = chunksById.get(id);
                if (chunk != null) {
                    results.add(chunk);
                }
            }
            return results;
        } catch (ParseException | IOException e) {
            log.warn("Persona retrieval failed for query '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    /** Fallback context when retrieve() finds nothing relevant — enough to answer generically. */
    public List<Chunk> defaultChunks() {
        List<Chunk> defaults = new ArrayList<>();
        if (chunksById.containsKey("bio")) defaults.add(chunksById.get("bio"));
        if (chunksById.containsKey("contact")) defaults.add(chunksById.get("contact"));
        return defaults;
    }

    /** Formats retrieved chunks into a prompt-ready context block, grouped by category. */
    public String formatForPrompt(List<Chunk> chunks) {
        if (chunks.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("=== RELEVANT CONTEXT ABOUT ME ===\n");
        for (Chunk chunk : chunks) {
            sb.append("[%s] %s\n".formatted(chunk.category(), chunk.text()));
        }
        return sb.toString();
    }
}
