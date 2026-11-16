package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.shared.domain.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** O título precisa existir no catálogo (veio de busca/populares). */
@Component
@RequiredArgsConstructor
class TitleGuard
{
    private final CatalogModulePort catalog;

    TitleView require(long titleId)
    {
        return catalog.findTitle(titleId).orElseThrow(() -> new NotFoundException("Título " + titleId + " não encontrado"));
    }
}
