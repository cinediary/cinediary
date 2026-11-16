package com.cinediary.api.modules.users.domain;

import java.util.Set;

/**
 * Pronomes do perfil: só opções da lista (não há texto livre). Guardamos o código e cada app mostra no idioma
 * de quem vê (ex.: {@code she} = "ela/dela" em português, "she/her" em inglês).
 */
public final class Pronouns
{
    public static final Set<String> CODES = Set.of("he", "she", "they", "he_they", "she_they", "any");

    private Pronouns()
    {
    }

    public static boolean isValid(String code)
    {
        return code != null && CODES.contains(code);
    }
}
