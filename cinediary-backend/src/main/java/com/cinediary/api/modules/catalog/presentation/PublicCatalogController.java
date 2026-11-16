package com.cinediary.api.modules.catalog.presentation;

import com.cinediary.api.modules.catalog.application.GetShowcaseUseCase;
import com.cinediary.api.modules.catalog.application.ShowcasePoster;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Rotas sem login (liberadas em /api/v1/public/** no SecurityConfig). */
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Público")
public class PublicCatalogController
{
    private final GetShowcaseUseCase showcase;

    @GetMapping("/showcase")
    @Operation(summary = "Pôsteres populares no país e no idioma do aparelho (boas-vindas e animação do Match)")
    public List<ShowcasePoster> showcase(@RequestParam(required = false) String region,
                                         @RequestParam(required = false) String language)
    {
        return showcase.execute(region, language);
    }
}
