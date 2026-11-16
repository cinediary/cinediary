package com.cinediary.api.modules.importing.domain;

import java.util.Optional;

/**
 * Descobre o filme de um link curto do Letterboxd (https://boxd.it/<código>), como os "Favorite Films"
 * do profile.csv quando o filme não aparece em nenhum outro CSV. Vazio se o link não for desse formato,
 * se o Letterboxd não responder ou se ele não apontar para a página de um filme.
 */
public interface LetterboxdLinkPort
{
    Optional<LetterboxdFilmRef> resolve(String shortLink);
}
