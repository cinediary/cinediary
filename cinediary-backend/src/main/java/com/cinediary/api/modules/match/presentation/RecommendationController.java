package com.cinediary.api.modules.match.presentation;

import com.cinediary.api.modules.match.application.GetRecommendationsUseCase;
import com.cinediary.api.modules.match.presentation.dto.BecauseYouLikedResponse;
import com.cinediary.api.modules.match.presentation.dto.ForYouResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Recomendações da Início. Ficam no módulo match porque usam o mesmo perfil de gosto e o grafo do Taste Match. */
@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recomendações")
public class RecommendationController
{
    private final GetRecommendationsUseCase recommendations;

    @GetMapping("/for-you")
    @Operation(summary = "Para você: gente com gosto parecido (Neo4j) e populares dos seus gêneros")
    public ForYouResponse forYou(CurrentUser user)
    {
        return ForYouResponse.from(recommendations.forYou(user.id()));
    }

    @GetMapping("/because-you-liked")
    @Operation(summary = "Porque você curtiu X: parecidos com um filme que você avaliou bem")
    public BecauseYouLikedResponse becauseYouLiked(CurrentUser user)
    {
        return BecauseYouLikedResponse.from(recommendations.becauseYouLiked(user.id()));
    }
}
