package com.cinediary.api.modules.social.presentation;

import com.cinediary.api.modules.social.application.GetTitleCommunityUseCase;
import com.cinediary.api.modules.social.presentation.dto.TitleCommunityResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Página do título: nota, amigos que assistiram e reviews. {@code titleId} é o id interno do catálogo. */
@RestController
@RequestMapping("/api/v1/titles/{titleId}")
@RequiredArgsConstructor
@Tag(name = "Social")
public class TitleCommunityController
{
    private final GetTitleCommunityUseCase community;

    @GetMapping("/community")
    @Operation(summary = "Nota consolidada (TMDB + CineDiary), amigos que assistiram e até 3 reviews em destaque")
    public TitleCommunityResponse summary(CurrentUser user, @PathVariable long titleId)
    {
        return TitleCommunityResponse.from(community.summary(titleId, user.id()));
    }

    @GetMapping("/reviews")
    @Operation(summary = "Todas as reviews do título: sort = POPULAR (curtidas), RECENT ou FRIENDS (quem você segue)")
    public List<TitleCommunityResponse.Review> reviews(CurrentUser user, @PathVariable long titleId,
                                                       @RequestParam(defaultValue = "POPULAR") String sort,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size)
    {
        GetTitleCommunityUseCase.Sort s;
        try {
            s = GetTitleCommunityUseCase.Sort.valueOf(sort.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            s = GetTitleCommunityUseCase.Sort.POPULAR;
        }
        return community.reviews(titleId, user.id(), s, page, Math.clamp(size, 1, 50)).stream()
                .map(TitleCommunityResponse.Review::from).toList();
    }
}
