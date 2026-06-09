package com.chineseapp.repository;

import com.chineseapp.entity.Conversation;
import com.chineseapp.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);

    @Query("""
        select m.audioPath
        from Message m
        where m.conversation.userId = :userId and m.audioPath is not null
        """)
    List<String> findAudioPathsByUserId(@Param("userId") UUID userId);
}
