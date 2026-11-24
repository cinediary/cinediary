package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.application.TitleBackdrop;
import java.util.List;

public record TitleBackdropsResponse(List<TitleBackdrop> backdrops)
{
}
