package com.cinediary.api.modules.diary.presentation;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.api.TitleStateView;
import com.cinediary.api.modules.diary.application.CreateDiaryEntryUseCase;
import com.cinediary.api.modules.diary.application.ListDiaryEntriesUseCase;
import com.cinediary.api.modules.diary.application.ListUndatedWatchedUseCase;
import com.cinediary.api.modules.diary.application.ManageDiaryEntryUseCase;
import com.cinediary.api.modules.diary.application.ListWatchlistUseCase;
import com.cinediary.api.modules.diary.application.UpdateSeriesEpisodesUseCase;
import com.cinediary.api.modules.diary.application.UpdateTitleStateUseCase;
import com.cinediary.api.modules.diary.presentation.dto.CreateDiaryEntryRequest;
import com.cinediary.api.modules.diary.presentation.dto.UpdateDiaryEntryRequest;
import com.cinediary.api.modules.diary.presentation.dto.DiaryEntryResponse;
import com.cinediary.api.modules.diary.presentation.dto.SeriesEpisodeProgressRequest;
import com.cinediary.api.modules.diary.presentation.dto.SeriesProgressResponse;
import com.cinediary.api.modules.diary.presentation.dto.UpdateTitleStateRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Diary & Series")
public class DiaryController
{
    private final UpdateTitleStateUseCase updateTitleState;
    private final CreateDiaryEntryUseCase createDiaryEntry;
    private final ListDiaryEntriesUseCase listDiaryEntries;
    private final ListWatchlistUseCase listWatchlist;
    private final ListUndatedWatchedUseCase listUndatedWatched;
    private final ManageDiaryEntryUseCase manageEntry;
    private final UpdateSeriesEpisodesUseCase updateSeriesEpisodes;

    @PutMapping("/titles/{titleId}/state")
    @Operation(summary = "Registro rápido (até 3 toques): assistido, nota, curtida, watchlist, status da série")
    public TitleStateView updateState(CurrentUser user, @PathVariable long titleId,
                                      @RequestBody UpdateTitleStateRequest request)
    {
        return updateTitleState.execute(user.id(), titleId, request.toChange());
    }

    @GetMapping("/watchlist")
    @Operation(summary = "Watchlist pessoal")
    public List<TitleSummaryView> watchlist(CurrentUser user)
    {
        return listWatchlist.execute(user.id());
    }

    @GetMapping("/diary/undated")
    @Operation(summary = "Filmes já assistidos sem data no diário (ex.: marcados no onboarding)")
    public List<TitleSummaryView> undated(CurrentUser user)
    {
        return listUndatedWatched.execute(user.id());
    }

    @GetMapping("/diary/entries")
    @Operation(summary = "Entradas do diário, mais recentes primeiro")
    public List<DiaryEntryResponse> entries(CurrentUser user,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size,
                                            @RequestParam(required = false) Long titleId)
    {
        return listDiaryEntries.execute(user.id(), page, size, titleId).stream().map(DiaryEntryResponse::from).toList();
    }

    @PostMapping("/diary/entries")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria uma entrada no diário (rewatch e review)")
    public DiaryEntryResponse createEntry(CurrentUser user, @Valid @RequestBody CreateDiaryEntryRequest request)
    {
        return DiaryEntryResponse.from(createDiaryEntry.execute(user.id(), request.toCommand()));
    }

    @GetMapping("/diary/entries/{entryId}")
    @Operation(summary = "Uma entrada do diário (só o dono)")
    public DiaryEntryResponse entry(CurrentUser user, @PathVariable UUID entryId)
    {
        return DiaryEntryResponse.from(manageEntry.get(user.id(), entryId));
    }

    @PutMapping("/diary/entries/{entryId}")
    @Operation(summary = "Edita data, nota, curtida, rever, review e spoiler de uma entrada")
    public DiaryEntryResponse updateEntry(CurrentUser user, @PathVariable UUID entryId,
                                          @Valid @RequestBody UpdateDiaryEntryRequest request)
    {
        return DiaryEntryResponse.from(manageEntry.update(user.id(), entryId, request.toCommand()));
    }

    @DeleteMapping("/diary/entries/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Exclui uma entrada do diário (o título continua marcado como visto)")
    public void deleteEntry(CurrentUser user, @PathVariable UUID entryId)
    {
        manageEntry.delete(user.id(), entryId);
    }

    @PutMapping("/series/{titleId}/episodes")
    @Operation(summary = "Marca/desmarca episódios ou a temporada inteira e atualiza o progresso")
    public SeriesProgressResponse updateEpisodes(CurrentUser user, @PathVariable long titleId,
                                                 @Valid @RequestBody SeriesEpisodeProgressRequest request)
    {
        return SeriesProgressResponse.from(updateSeriesEpisodes.execute(user.id(), titleId, request.toCommand()));
    }
}
