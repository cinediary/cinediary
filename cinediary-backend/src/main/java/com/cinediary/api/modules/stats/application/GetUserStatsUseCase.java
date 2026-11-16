package com.cinediary.api.modules.stats.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.social.api.SocialModulePort;
import com.cinediary.api.modules.stats.domain.StatsQueryPort;
import com.cinediary.api.modules.stats.domain.UserStatsModel;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.ContentLanguage;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.time.YearMonth;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Estatísticas gratuitas do perfil. Perfil privado: só o dono e quem segue (aprovado). Gráfico: últimos 12 meses. */
@Service
@RequiredArgsConstructor
public class GetUserStatsUseCase
{
    private final UsersModulePort users;
    private final StatsQueryPort stats;
    private final CatalogModulePort catalog;
    private final SocialModulePort social;

    @Transactional(readOnly = true)
    public UserStatsModel execute(String username, UUID viewerId)
    {
        String normalized = username.startsWith("@") ? username.substring(1) : username;
        UserView user = users.findByUsername(normalized.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new NotFoundException("Perfil não encontrado"));
        // Privado: o dono e quem segue com o pedido aprovado (módulo social).
        if (!social.canSeeContent(viewerId, user.id())) {
            throw new ForbiddenException("Este perfil é privado");
        }
        YearMonth now = YearMonth.now();
        UserStatsModel model = stats.statsOf(user.id(), now.minusMonths(11), now, 5);
        if (ContentLanguage.current() == ContentLanguage.PT || model.topGenres().isEmpty()) {
            return model;
        }
        // O cache guarda os gêneros em PT-BR; quem vê em outro idioma recebe o nome traduzido (pelo id).
        var names = catalog.genreNames(model.topGenres().stream().map(UserStatsModel.GenreCount::genreId).toList());
        return model.withTopGenres(model.topGenres().stream()
                .map(g -> new UserStatsModel.GenreCount(g.genreId(), names.getOrDefault(g.genreId(), g.genreName()), g.count()))
                .toList());
    }
}
