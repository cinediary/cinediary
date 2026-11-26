package com.cinediary.api.shared.domain;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Tags de um registro do diário (#58): sem espaços nas pontas, minúsculas, sem repetir. */
public final class EntryTags
{
    public static final int MAX_LENGTH = 30;
    public static final int MAX_PER_ENTRY = 10;

    private EntryTags()
    {
    }

    public static String normalize(String raw)
    {
        return raw == null ? "" : raw.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /** Digitadas no app: tag longa demais ou mais de 10 é erro. */
    public static List<String> validate(Collection<String> raw)
    {
        Set<String> out = new LinkedHashSet<>();
        for (String tag : raw == null ? List.<String>of() : raw) {
            String t = normalize(tag);
            if (t.isEmpty()) {
                continue;
            }
            if (t.length() > MAX_LENGTH) {
                throw new DomainValidationException("Uma tag pode ter até " + MAX_LENGTH + " caracteres");
            }
            out.add(t);
        }
        if (out.size() > MAX_PER_ENTRY) {
            throw new DomainValidationException("Um registro pode ter até " + MAX_PER_ENTRY + " tags");
        }
        return List.copyOf(out);
    }

    /** Vindas de fora (importação): o que não cabe nas regras fica de fora, sem erro. */
    public static List<String> lenient(Collection<String> raw)
    {
        return (raw == null ? List.<String>of() : raw).stream()
                .map(EntryTags::normalize)
                .filter(t -> !t.isEmpty() && t.length() <= MAX_LENGTH)
                .distinct()
                .limit(MAX_PER_ENTRY)
                .toList();
    }
}
