package com.cinediary.api.modules.social.presentation;

import com.cinediary.api.modules.social.application.EntryInteractionsUseCase;
import com.cinediary.api.modules.social.presentation.dto.CreateCommentRequest;
import com.cinediary.api.modules.social.presentation.dto.EntryCommentResponse;
import com.cinediary.api.modules.social.presentation.dto.EntryInteractionsResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Curtir e responder uma entrada do diário (sua ou de quem você pode ver). */
@RestController
@RequestMapping("/api/v1/entries/{entryId}")
@RequiredArgsConstructor
@Tag(name = "Social")
public class EntryInteractionsController
{
    private final EntryInteractionsUseCase interactions;

    @GetMapping("/interactions")
    @Operation(summary = "Curtidas (e se você curtiu) e número de respostas")
    public EntryInteractionsResponse summary(CurrentUser user, @PathVariable UUID entryId)
    {
        return EntryInteractionsResponse.from(interactions.summary(entryId, user.id()));
    }

    @PutMapping("/like")
    @Operation(summary = "Curtir a entrada")
    public EntryInteractionsResponse like(CurrentUser user, @PathVariable UUID entryId)
    {
        return EntryInteractionsResponse.from(interactions.like(entryId, user.id()));
    }

    @DeleteMapping("/like")
    @Operation(summary = "Tirar a curtida")
    public EntryInteractionsResponse unlike(CurrentUser user, @PathVariable UUID entryId)
    {
        return EntryInteractionsResponse.from(interactions.unlike(entryId, user.id()));
    }

    @GetMapping("/comments")
    @Operation(summary = "Respostas, mais antigas primeiro")
    public List<EntryCommentResponse> comments(CurrentUser user, @PathVariable UUID entryId)
    {
        return interactions.comments(entryId, user.id()).stream().map(EntryCommentResponse::from).toList();
    }

    @PostMapping("/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Responder a entrada")
    public EntryCommentResponse comment(CurrentUser user, @PathVariable UUID entryId, @Valid @RequestBody CreateCommentRequest request)
    {
        return EntryCommentResponse.from(interactions.comment(entryId, user.id(), request.text()));
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Apagar uma resposta (quem escreveu ou o dono da entrada)")
    public void deleteComment(CurrentUser user, @PathVariable UUID entryId, @PathVariable UUID commentId)
    {
        interactions.deleteComment(entryId, commentId, user.id());
    }
}
