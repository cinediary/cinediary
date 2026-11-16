package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.util.List;

/** Produtora com os filmes dela (já com o estado do usuário em cada título). */
public record CompanyDetail(long id, String name, String logoUrl, String originCountry, List<TitleSummaryView> titles)
{
}
