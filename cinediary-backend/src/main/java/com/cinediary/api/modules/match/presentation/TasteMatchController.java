package com.cinediary.api.modules.match.presentation;

import com.cinediary.api.modules.match.application.AcceptTasteMatchUseCase;
import com.cinediary.api.modules.match.application.CreateTasteMatchUseCase;
import com.cinediary.api.modules.match.application.GetMatchStoryUseCase;
import com.cinediary.api.modules.match.application.ListUserMatchesUseCase;
import com.cinediary.api.modules.match.application.LeaveTasteMatchUseCase;
import com.cinediary.api.modules.match.application.ManageSharedWatchlistUseCase;
import com.cinediary.api.modules.match.presentation.dto.AddSharedWatchlistRequest;
import com.cinediary.api.modules.match.presentation.dto.MatchStoryResponse;
import com.cinediary.api.modules.match.presentation.dto.SharedWatchlistItemResponse;
import com.cinediary.api.modules.match.presentation.dto.TasteMatchSummaryResponse;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
@Tag(name = "Taste Match (Neo4j + GDS)")
public class TasteMatchController
{
    private final CreateTasteMatchUseCase createTasteMatch;
    private final ListUserMatchesUseCase listUserMatches;
    private final AcceptTasteMatchUseCase acceptTasteMatch;
    private final GetMatchStoryUseCase getMatchStory;
    private final ManageSharedWatchlistUseCase sharedWatchlist;
    private final LeaveTasteMatchUseCase leaveTasteMatch;

    @GetMapping
    @Operation(summary = "Matches do usuário (PENDING, BUILDING e ACTIVE)")
    public List<TasteMatchSummaryResponse> list(CurrentUser user)
    {
        return listUserMatches.execute(user.id()).stream().map(TasteMatchSummaryResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria um Taste Match e gera o convite")
    public TasteMatchSummaryResponse create(CurrentUser user)
    {
        return TasteMatchSummaryResponse.from(createTasteMatch.execute(user.id()));
    }

    @PostMapping("/{inviteCode}/accept")
    @Operation(summary = "Aceita o convite e calcula no Neo4j + GDS (BUILDING se faltar histórico)")
    public MatchStoryResponse accept(CurrentUser user, @PathVariable String inviteCode)
    {
        return MatchStoryResponse.from(acceptTasteMatch.execute(user.id(), inviteCode));
    }

    @GetMapping("/{matchId}/story")
    @Operation(summary = "Os 8 slides do Match Story com a explicação da porcentagem")
    public MatchStoryResponse story(CurrentUser user, @PathVariable UUID matchId)
    {
        return MatchStoryResponse.from(getMatchStory.execute(user.id(), matchId));
    }

    @GetMapping("/{matchId}/watchlist")
    @Operation(summary = "Watchlist compartilhada da dupla")
    public List<SharedWatchlistItemResponse> watchlist(CurrentUser user, @PathVariable UUID matchId)
    {
        return sharedWatchlist.list(user.id(), matchId).stream().map(SharedWatchlistItemResponse::from).toList();
    }

    @PostMapping("/{matchId}/watchlist")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Adiciona um título à watchlist compartilhada")
    public SharedWatchlistItemResponse addToWatchlist(CurrentUser user, @PathVariable UUID matchId,
                                                      @Valid @RequestBody AddSharedWatchlistRequest request)
    {
        return SharedWatchlistItemResponse.from(sharedWatchlist.add(user.id(), matchId, request.titleId()));
    }

    @DeleteMapping("/{matchId}/watchlist/{titleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove um título da watchlist compartilhada")
    public void removeFromWatchlist(CurrentUser user, @PathVariable UUID matchId, @PathVariable long titleId)
    {
        sharedWatchlist.remove(user.id(), matchId, titleId);
    }

    @DeleteMapping("/{matchId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Sai do Match: encerra para os dois e apaga a lista de vocês (convite pendente = cancela)")
    public void leave(CurrentUser user, @PathVariable UUID matchId)
    {
        leaveTasteMatch.execute(user.id(), matchId);
    }
}
