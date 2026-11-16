package com.cinediary.api.modules.users.infrastructure.clerk.payload;

import com.cinediary.api.modules.users.domain.ClerkAvatars;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * Campos de {@code data} dos eventos user.*. {@code updatedAt} em epoch millis.
 * {@code hasImage}: o Clerk sempre manda um {@code image_url}, mesmo sem foto (é um avatar genérico
 * gerado por ele); só {@code has_image=true} indica uma foto de verdade.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ClerkUser(String id, String username, String firstName, String lastName, String imageUrl,
                        Boolean hasImage, String primaryEmailAddressId, List<ClerkEmailAddress> emailAddresses,
                        Long updatedAt)
{
    /** A foto enviada pela pessoa, ou null (o app mostra a inicial do nome). */
    public String photoUrl()
    {
        return ClerkAvatars.photoOrNull(imageUrl, hasImage);
    }

    public ClerkUser
    {
        emailAddresses = emailAddresses == null ? List.of() : emailAddresses;
    }
}
