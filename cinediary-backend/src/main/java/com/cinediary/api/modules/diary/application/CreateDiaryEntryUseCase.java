package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.SeasonView;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.cinediary.api.modules.diary.api.TitleInteractionUpdatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Entrada no diário (permite rewatch e review).
 * - Título inteiro (filme ou série toda): marca como assistido e a nota/curtida viram as do título.
 * - Temporada ou episódio (só séries): marca a temporada/o episódio como visto no progresso, mas a nota
 *   e a curtida ficam só na entrada; a nota da série inteira não muda.
 */
@Service
@RequiredArgsConstructor
public class CreateDiaryEntryUseCase
{
    private final DiaryRepositoryPort repository;
    private final TitleGuard titles;
    private final CatalogModulePort catalog;
    private final ApplicationEventPublisher events;
    private final UpdateSeriesEpisodesUseCase seriesEpisodes;

    @Transactional
    public DiaryEntryResult execute(UUID userId, CreateDiaryEntryCommand cmd)
    {
        TitleView title = titles.require(cmd.titleId());
        validateScope(title, cmd);
        EntryRules.date(cmd.watchedDate());
        BigDecimal rating = EntryRules.rating(cmd.rating());
        String review = EntryRules.review(cmd.reviewText());

        DiaryEntryModel saved = repository.saveEntry(new DiaryEntryModel(null, userId, cmd.titleId(), cmd.watchedDate(),
                rating, cmd.liked(), cmd.rewatch(), review, null, null, cmd.seasonNumber(), cmd.episodeNumber(),
                review != null && cmd.containsSpoilers(), cmd.replyPolicy()));
        if (saved.isScoped()) {
            // Registrar um episódio/temporada também é ter visto: entra no progresso (e no status da série).
            seriesEpisodes.execute(userId, cmd.titleId(), new UpdateSeriesEpisodesCommand(cmd.seasonNumber(),
                    cmd.episodeNumber() == null ? List.of() : List.of(cmd.episodeNumber()), true, null));
        } else {
            TitleStateModel state = repository.findState(userId, cmd.titleId())
                    .orElse(TitleStateModel.empty(userId, cmd.titleId()));
            repository.saveState(state.logged(rating, cmd.liked(), Instant.now()));
            events.publishEvent(new TitleInteractionUpdatedEvent(userId, cmd.titleId()));
        }

        return new DiaryEntryResult(saved, catalog.summaries(List.of(cmd.titleId()), userId).getFirst());
    }

    /** Temporada/episódio só em séries, e precisam existir no catálogo. */
    private void validateScope(TitleView title, CreateDiaryEntryCommand cmd)
    {
        if (cmd.seasonNumber() == null) {
            if (cmd.episodeNumber() != null) {
                throw new DomainValidationException("Informe a temporada do episódio");
            }
            return;
        }
        if (!"SERIES".equals(title.mediaType())) {
            throw new DomainValidationException("Temporada e episódio só valem para séries");
        }
        SeasonView season = catalog.seasonsOf(title.id()).stream()
                .filter(s -> s.seasonNumber() == cmd.seasonNumber()).findFirst()
                .orElseThrow(() -> new DomainValidationException("Temporada " + cmd.seasonNumber() + " não existe"));
        if (cmd.episodeNumber() != null && (cmd.episodeNumber() < 1 || cmd.episodeNumber() > season.episodeCount())) {
            throw new DomainValidationException("Episódio " + cmd.episodeNumber() + " não existe na temporada " + cmd.seasonNumber());
        }
    }
}
