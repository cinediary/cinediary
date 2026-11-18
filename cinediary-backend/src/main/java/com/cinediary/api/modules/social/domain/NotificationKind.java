package com.cinediary.api.modules.social.domain;

/** O que aconteceu. Curtidas no mesmo registro são agrupadas no sino; o resto aparece um por um. */
public enum NotificationKind
{
    FOLLOWED, FOLLOW_REQUESTED, FOLLOW_APPROVED, ENTRY_LIKED, ENTRY_REPLIED,
    /** Você foi marcado num registro ("vi com…"): aceitar ou recusar. */
    ENTRY_COMPANION;

    public boolean groupsByEntry()
    {
        return this == ENTRY_LIKED;
    }
}
