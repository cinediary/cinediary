package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.SeasonView;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.SeriesProgress;
import com.cinediary.api.modules.diary.domain.SeriesStatus;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import com.cinediary.api.modules.diary.api.TitleInteractionUpdatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Marca/desmarca episódios ou a temporada inteira e recalcula o progresso e o status da série. */
@Service
@RequiredArgsConstructor
public class UpdateSeriesEpisodesUseCase
{
    private final DiaryRepositoryPort repository;
    private final TitleGuard titles;
    private final CatalogModulePort catalog;
    private final ApplicationEventPublisher events;

    @Transactional
    public SeriesProgress execute(UUID userId, long titleId, UpdateSeriesEpisodesCommand cmd)
    {
        TitleView title = titles.require(titleId);
        if (!"SERIES".equals(title.mediaType())) {
            throw new DomainValidationException("Progresso por episódio só vale para séries");
        }
        List<SeasonView> seasons = catalog.seasonsOf(titleId);
        SeasonView season = seasons.stream().filter(s -> s.seasonNumber() == cmd.seasonNumber()).findFirst()
                .orElseThrow(() -> new DomainValidationException("Temporada " + cmd.seasonNumber() + " não existe"));

        List<Integer> episodes = cmd.episodeNumbers() == null || cmd.episodeNumbers().isEmpty()
                ? IntStream.rangeClosed(1, season.episodeCount()).boxed().toList()
                : cmd.episodeNumbers().stream().distinct().toList();
        for (Integer ep : episodes) {
            if (ep == null || ep < 1 || ep > season.episodeCount()) {
                throw new DomainValidationException("Episódio " + ep + " não existe na temporada " + cmd.seasonNumber());
            }
        }
        if (cmd.watched()) {
            repository.markEpisodes(userId, titleId, cmd.seasonNumber(), episodes);
        } else {
            repository.unmarkEpisodes(userId, titleId, cmd.seasonNumber(), episodes);
        }

        int total = seasons.stream().mapToInt(SeasonView::episodeCount).sum();
        int watched = repository.countWatchedEpisodes(userId, titleId);
        TitleStateModel state = repository.findState(userId, titleId).orElse(TitleStateModel.empty(userId, titleId));
        SeriesStatus status = SeriesProgress.resolveStatus(cmd.seriesStatus(), state.seriesStatus(), watched, total);
        repository.saveState(state.withSeriesProgress(status, status == SeriesStatus.COMPLETED, Instant.now()));
        events.publishEvent(new TitleInteractionUpdatedEvent(userId, titleId));

        return new SeriesProgress(titleId, total, watched, SeriesProgress.percentage(watched, total), status);
    }
}
