package com.cinediary.api.modules.users.domain;

/**
 * O Clerk sempre devolve um {@code image_url}, mesmo para quem não enviou foto: nesse caso é um avatar
 * genérico gerado por ele. A regra do app é: foto enviada → mostra a foto; sem foto → o app mostra a
 * inicial do nome (fica igual para todo mundo). Por isso o avatar genérico nunca é salvo.
 * O URL do Clerk é img.clerk.com/<JSON em base64>; o genérico começa com {"type":"default".
 */
public final class ClerkAvatars
{
    /** {@code {"type":"default"} em base64 (o que vem logo depois de img.clerk.com/). */
    private static final String GENERIC_PREFIX = "https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdC";

    private ClerkAvatars()
    {
    }

    /**
     * A foto a salvar, ou null para mostrar a inicial.
     * {@code hasImage} vem do webhook (has_image); null quando não se sabe (ex.: claim do token no JIT).
     */
    public static String photoOrNull(String imageUrl, Boolean hasImage)
    {
        if (imageUrl == null || imageUrl.isBlank() || Boolean.FALSE.equals(hasImage)) {
            return null;
        }
        return imageUrl.startsWith(GENERIC_PREFIX) ? null : imageUrl;
    }
}
