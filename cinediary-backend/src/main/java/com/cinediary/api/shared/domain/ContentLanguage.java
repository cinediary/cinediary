package com.cinediary.api.shared.domain;

import java.util.Locale;

/**
 * Idioma do conteúdo (títulos, sinopses, gêneros do TMDB) de quem fez o pedido. Vem do
 * {@code Accept-Language} que o app manda (o idioma do aparelho): "pt…" → PT, "en…" → EN e qualquer
 * outra coisa (ou sem cabeçalho) → PT. Fora de um pedido HTTP (eventos assíncronos, importação) vale PT,
 * que é o idioma base do cache do catálogo.
 * <p>
 * Guardado por thread pelo {@code ContentLanguageFilter} durante o pedido; cada pessoa recebe o próprio
 * idioma, sem mudar o que as outras veem.
 */
public enum ContentLanguage
{
    PT("pt-BR", Locale.of("pt", "BR")),
    EN("en-US", Locale.US);

    private static final ThreadLocal<ContentLanguage> CURRENT = new ThreadLocal<>();

    private final String tag;
    private final Locale locale;

    ContentLanguage(String tag, Locale locale)
    {
        this.tag = tag;
        this.locale = locale;
    }

    /** BCP 47 usado no TMDB (ex.: en-US). */
    public String tag()
    {
        return tag;
    }

    /** Código curto (ex.: en), guardado na tabela de traduções. */
    public String code()
    {
        return tag.substring(0, 2);
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

    /** "en-US,en;q=0.9" → EN; "pt-BR" → PT; vazio ou outro idioma → PT. */
    public static ContentLanguage fromHeader(String acceptLanguage)
    {
        if (acceptLanguage == null || acceptLanguage.isBlank()) {
            return PT;
        }
        String first = acceptLanguage.split(",")[0].strip().toLowerCase(Locale.ROOT);
        return first.startsWith("en") ? EN : PT;
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
