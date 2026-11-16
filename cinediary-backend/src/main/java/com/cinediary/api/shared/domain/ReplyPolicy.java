package com.cinediary.api.shared.domain;

/**
 * Quem pode responder uma entrada do diário: só o dono (ME), quem o dono segue (FOLLOWING) ou qualquer pessoa
 * que possa ver a entrada (EVERYONE). A conta tem um padrão; cada entrada pode trocar (null = usa o da conta).
 */
public enum ReplyPolicy
{
    ME, FOLLOWING, EVERYONE;

    /** "DEFAULT", vazio ou null = seguir o padrão da conta (null); senão o valor. */
    public static ReplyPolicy parseOrDefault(String raw)
    {
        if (raw == null || raw.isBlank() || raw.equalsIgnoreCase("DEFAULT")) {
            return null;
        }
        try {
            return valueOf(raw.strip().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DomainValidationException("Quem pode responder: use ME, FOLLOWING, EVERYONE ou DEFAULT");
        }
    }
}
