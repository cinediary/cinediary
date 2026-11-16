package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.util.List;

/** Pessoa com os títulos em que atuou e os que dirigiu (já com o estado do usuário em cada título). */
public record PersonDetail(long id, String name, String photoUrl, String knownForDepartment,
                           List<TitleSummaryView> acting, List<TitleSummaryView> directing)
{
}
