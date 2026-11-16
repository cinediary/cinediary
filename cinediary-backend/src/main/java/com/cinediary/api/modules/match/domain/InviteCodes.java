package com.cinediary.api.modules.match.domain;

import java.security.SecureRandom;
import java.util.Locale;

/** Código de convite curto, sem caracteres ambíguos (0/O, 1/I/L). */
public final class InviteCodes
{
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private InviteCodes()
    {
    }

    public static String generate()
    {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    public static String normalize(String code)
    {
        return code == null ? "" : code.strip().toUpperCase(Locale.ROOT);
    }
}
