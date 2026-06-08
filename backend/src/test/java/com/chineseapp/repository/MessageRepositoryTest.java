package com.chineseapp.repository;

import com.chineseapp.entity.Conversation;
import com.chineseapp.entity.Message;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "app.llm.api-key=test-api-key")
@Testcontainers
class MessageRepositoryTest {

    @Container
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    @Autowired
    MessageRepositoryTest(ConversationRepository conversationRepository, MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void findByConversationOrderByCreatedAtAsc_givenMessages_thenReturnsInCreatedAtOrder() {
        Instant createdAt = Instant.parse("2026-01-01T00:00:00Z");
        Conversation conversation = new Conversation(
            UUID.randomUUID(),
            null,
            "Test conversation",
            createdAt,
            createdAt
        );
        conversationRepository.save(conversation);

        Message firstMessage = new Message(
            UUID.randomUUID(),
            conversation,
            "user",
            "你好",
            null,
            createdAt.plusSeconds(1)
        );
        Message secondMessage = new Message(
            UUID.randomUUID(),
            conversation,
            "assistant",
            "你好！",
            null,
            createdAt.plusSeconds(2)
        );
        messageRepository.save(firstMessage);
        messageRepository.save(secondMessage);

        List<Message> messages = messageRepository.findByConversationOrderByCreatedAtAsc(conversation);

        assertThat(messages)
            .extracting(Message::getId)
            .containsExactly(firstMessage.getId(), secondMessage.getId());
    }
}
