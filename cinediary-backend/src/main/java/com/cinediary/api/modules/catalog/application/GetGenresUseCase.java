package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.Genre;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GetGenresUseCase
{
    private final GenreNamesService genreNames;

    public List<Genre> execute()
    {
        return genreNames.all();
    }
}
