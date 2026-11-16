package com.cinediary.api.modules.catalog.domain;

import com.cinediary.api.shared.domain.ContentLanguage;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CatalogRepositoryPort
{
    /**
     * As leituras trazem as traduções do idioma do pedido ({@link ContentLanguage#current()}) quando ele
     * não é o PT-BR.
     */
    Optional<CatalogTitleModel> findById(long id);

    List<CatalogTitleModel> findByIds(Collection<Long> ids);

    Optional<CatalogTitleModel> findByTmdb(MediaType mediaType, long tmdbId);

    /** Busca textual no cache (fallback offline). {@code type}: ALL | MOVIE | SERIES. */
    List<CatalogTitleModel> searchLocal(String query, String type, int page, int size);

    /** Filme em cache com esse título (pt-BR ou original) e ano. */
    Optional<CatalogTitleModel> findMovieByTitleAndYear(String name, Integer year);

    List<CatalogTitleModel> topByGenres(Collection<Integer> genreIds, Collection<Long> excludeIds, int limit);

    /** Upsert de resultado de busca: não marca os detalhes como sincronizados. */
    default long saveSummary(TmdbTitle title)
    {
        return saveSummary(title, ContentLanguage.PT);
    }

    /**
     * Resultado de busca vindo do TMDB no idioma {@code language}. PT atualiza a base; outro idioma só
     * cria a linha se ela não existir (com o nome desse idioma até o PT chegar) e grava a tradução, sem
     * nunca sobrescrever o português.
     */
    long saveSummary(TmdbTitle title, ContentLanguage language);

    /** Upsert do detalhe completo + temporadas, de forma atômica. */
    default long saveDetail(TmdbTitle title)
    {
        return saveDetail(title, ContentLanguage.PT);
    }

    /** Detalhe vindo do TMDB no idioma {@code language} (mesma regra do saveSummary). */
    long saveDetail(TmdbTitle title, ContentLanguage language);

    /**
     * Trailer guardado no último detalhe, nesse idioma. Vazio = ainda não conferido (título antigo);
     * presente com chave nula = conferido e não tem trailer.
     */
    java.util.Optional<KnownTrailer> trailer(long titleId, ContentLanguage language);

    /** Nota do TMDB gravada no último detalhe (vazio se ainda não veio). */
    java.util.Optional<TmdbRating> tmdbRating(long titleId);

    List<SeasonModel> findSeasons(long titleId);
}
