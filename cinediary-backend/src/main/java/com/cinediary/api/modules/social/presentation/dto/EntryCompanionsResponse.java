package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.social.application.EntryCompanions;
import java.util.List;
import java.util.UUID;

/**
 * "Vi com…" de um registro. {@code companions}: o dono vê PENDING e ACCEPTED (recusas aparecem como PENDING); os outros,
 * só ACCEPTED. {@code myStatus}: se quem vê foi marcado (PENDING, ACCEPTED ou DECLINED), ou nulo.
 */
public record EntryCompanionsResponse(List<Companion> companions, String myStatus)
{
    public record Companion(UUID id, String username, String displayName, String avatarUrl, String status)
    {
    }

    public static EntryCompanionsResponse from(EntryCompanions c)
    {
        return new EntryCompanionsResponse(
                c.companions().stream()
                        .map(i -> new Companion(i.person().id(), i.person().username(), i.person().displayName(),
                                i.person().avatarUrl(), i.status().name()))
                        .toList(),
                c.myStatus() == null ? null : c.myStatus().name());
    }
}
