package com.cinediary.api.modules.social.domain;

/** O que aconteceu. Curtidas no mesmo registro são agrupadas no sino; o resto aparece um por um. */
public enum NotificationKind
{
    FOLLOWED, FOLLOW_REQUESTED, FOLLOW_APPROVED, ENTRY_LIKED, ENTRY_REPLIED,
    /** Você foi marcado num registro ("vi com…"): aceitar ou recusar. */
    ENTRY_COMPANION,
    /** Curtiram uma lista sua (#20): agrupado por lista, como as curtidas num registro. */
    LIST_LIKED;

    public boolean groupsByEntry()
    {
        return this == ENTRY_LIKED;
    }

    public boolean groupsByList()
    {
        return this == LIST_LIKED;
    }
}
