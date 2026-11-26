package com.cinediary.api.shared.domain;

import java.util.Locale;

/**
 * Idioma do conteúdo (títulos, sinopses, gêneros do TMDB) de quem fez o pedido. Vem do
 * {@code Accept-Language} que o app manda (o idioma e a região do aparelho): "pt…" → PT, "en…" → EN,
 * "es-ES" → ES (Espanha), qualquer outro "es…" → ES_419 (América Latina, os títulos do TMDB em es-MX),
 * "fr…" → FR e qualquer outra coisa (ou sem cabeçalho) → PT. Fora de um pedido HTTP (eventos assíncronos,
 * importação) vale PT, que é o idioma base do cache do catálogo.
 * <p>
 * Guardado por thread pelo {@code ContentLanguageFilter} durante o pedido; cada pessoa recebe o próprio
 * idioma, sem mudar o que as outras veem.
 */
public enum ContentLanguage
{
    PT("pt-BR", "pt", Locale.of("pt", "BR"), "Gênero "),
    EN("en-US", "en", Locale.US, "Genre "),
    /** Espanhol da Espanha: os títulos de lá mudam bastante em relação à América Latina. */
    ES("es-ES", "es", Locale.of("es", "ES"), "Género "),
    /** Espanhol da América Latina (o TMDB usa es-MX para a região). */
    ES_419("es-MX", "es-MX", Locale.of("es", "MX"), "Género "),
    FR("fr-FR", "fr", Locale.FRANCE, "Genre ");

    private static final ThreadLocal<ContentLanguage> CURRENT = new ThreadLocal<>();

    private final String tag;
    private final String code;
    private final Locale locale;
    private final String genrePrefix;

    ContentLanguage(String tag, String code, Locale locale, String genrePrefix)
    {
        this.tag = tag;
        this.code = code;
        this.locale = locale;
        this.genrePrefix = genrePrefix;
    }

    /** BCP 47 usado no TMDB (ex.: en-US). */
    public String tag()
    {
        return tag;
    }

    /**
     * Código guardado na tabela de traduções e nas chaves de cache (ex.: en). O espanhol da América Latina é
     * "es-MX", para não se misturar com o da Espanha ("es"). Cabe no VARCHAR(8) da tabela.
     */
    public String code()
    {
        return code;
    }

    /** Antes do número, quando o nome de um gênero não chegou do TMDB (ex.: "Genre 18"). */
    public String genrePrefix()
    {
        return genrePrefix;
    }

    public Locale locale()
    {
        return locale;
    }

    public static ContentLanguage current()
    {
        ContentLanguage l = CURRENT.get();
        return l == null ? PT : l;
    }

    /**
     * "en-US,en;q=0.9" → EN; "pt-BR" → PT; "es-ES" → ES; "es-MX", "es-AR" ou só "es" → ES_419; "fr-CA" → FR;
     * vazio ou outro idioma → PT.
     */
    public static ContentLanguage fromHeader(String acceptLanguage)
    {
        if (acceptLanguage == null || acceptLanguage.isBlank()) {
            return PT;
        }
        String first = acceptLanguage.split(",")[0].split(";")[0].strip().toLowerCase(Locale.ROOT).replace('_', '-');
        String language = first.split("-")[0];
        return switch (language) {
            case "en" -> EN;
            case "es" -> first.equals("es-es") ? ES : ES_419;
            case "fr" -> FR;
            default -> PT;
        };
    }

    /** O idioma guardado com {@link #code()} (ex.: o de um aparelho); desconhecido ou vazio → PT. */
    public static ContentLanguage fromCode(String code)
    {
        for (ContentLanguage l : values()) {
            if (l.code.equals(code)) {
                return l;
            }
        }
        return PT;
    }

    public static void set(ContentLanguage language)
    {
        CURRENT.set(language);
    }

    public static void clear()
    {
        CURRENT.remove();
    }
}
