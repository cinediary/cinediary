package com.cinediary.api.modules.stats.presentation;

import com.cinediary.api.modules.stats.application.GetUserStatsUseCase;
import com.cinediary.api.modules.stats.domain.UserStatsModel;
import com.cinediary.api.modules.stats.presentation.dto.UserStatsResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Stats")
public class StatsController
{
    private final GetUserStatsUseCase getUserStats;

    @GetMapping("/{username}/stats")
    @Operation(summary = "Totais, nota média, top gêneros e filmes por mês (últimos 12 meses)")
    public UserStatsResponse stats(CurrentUser user, @PathVariable String username)
    {
        UserStatsModel m = getUserStats.execute(username, user.id());
        return UserStatsResponse.from(m);
    }
}
