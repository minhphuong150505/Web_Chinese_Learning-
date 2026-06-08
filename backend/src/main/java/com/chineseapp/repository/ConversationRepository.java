package com.chineseapp.repository;

import com.chineseapp.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByIdAndUserId(UUID id, UUID userId);

    List<Conversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
