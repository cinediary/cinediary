package com.cinediary.api.modules.users.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

/** Normaliza @usernames: minúsculas, sem acento, apenas [a-z0-9_.], 3 a 30 caracteres. */
public final class Usernames
{
    /** Prefixo dos @usernames provisórios do JIT; o webhook do Clerk pode substituí-los. */
    public static final String PLACEHOLDER_PREFIX = "cinefilo_";
    private static final int MAX = 30;

    private Usernames()
    {
    }

    public static boolean isValid(String username)
    {
        return username != null && username.matches("[a-z0-9_.]{3,30}");
    }

    public static boolean isPlaceholder(String username)
    {
        return username != null && username.startsWith(PLACEHOLDER_PREFIX);
    }

    public static String sanitize(String raw)
    {
        if (raw == null) {
            return null;
        }
        String s = Normalizer.normalize(raw, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_.]", "");
        if (s.length() > MAX) {
            s = s.substring(0, MAX);
        }
        return s.length() < 3 ? null : s;
    }

    public static String placeholder()
    {
        return PLACEHOLDER_PREFIX + randomDigits(6);
    }

    /** {@code eduu_9522} é o {@code eduu} com o sufixo automático de {@link #withSuffix}. */
    public static boolean isAutoSuffixOf(String username, String base)
    {
        if (username == null || base == null || base.isBlank()) {
            return false;
        }
        String trimmed = base.length() > MAX - 5 ? base.substring(0, MAX - 5) : base;
        return username.matches(java.util.regex.Pattern.quote(trimmed) + "_\\d{4}");
    }

    public static String withSuffix(String base)
    {
        String trimmed = base.length() > MAX - 5 ? base.substring(0, MAX - 5) : base;
        return trimmed + "_" + randomDigits(4);
    }

    private static String randomDigits(int n)
    {
        StringBuilder sb = new StringBuilder(n);
        for (int i = 0; i < n; i++) {
            sb.append(ThreadLocalRandom.current().nextInt(10));
        }
        return sb.toString();
    }
}
