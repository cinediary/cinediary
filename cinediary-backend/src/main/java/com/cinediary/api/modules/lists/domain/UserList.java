package com.cinediary.api.modules.lists.domain;

import com.cinediary.api.shared.domain.DomainValidationException;
import java.time.Instant;
import java.util.UUID;

/**
 * Uma lista de alguém. O nome é obrigatório (até 100 caracteres) e a descrição tem até 1.000.
 *
 * @param ranked a ordem importa (o app mostra o número de cada título)
 */
public record UserList(UUID id, UUID ownerId, String name, String description, boolean ranked, ListVisibility visibility,
                       Instant createdAt, Instant updatedAt)
{
    public static final int MAX_NAME = 100;
    public static final int MAX_DESCRIPTION = 1000;
    /** Títulos por lista. */
    public static final int MAX_ITEMS = 500;

    public UserList
    {
        name = name == null ? null : name.strip();
        if (name == null || name.isEmpty()) {
            throw new DomainValidationException("Dê um nome para a lista");
        }
        if (name.length() > MAX_NAME) {
            throw new DomainValidationException("O nome da lista pode ter no máximo " + MAX_NAME + " caracteres");
        }
        description = description == null || description.isBlank() ? null : description.strip();
        if (description != null && description.length() > MAX_DESCRIPTION) {
            throw new DomainValidationException("A descrição pode ter no máximo " + MAX_DESCRIPTION + " caracteres");
        }
        if (visibility == null) {
            visibility = ListVisibility.PUBLIC;
        }
    }

    public static UserList create(UUID ownerId, String name, String description, boolean ranked, ListVisibility visibility)
    {
        return new UserList(null, ownerId, name, description, ranked, visibility, null, null);
    }

    public boolean isOwnedBy(UUID userId)
    {
        return ownerId.equals(userId);
    }

    /** Os campos que vierem (PATCH); null = fica como está. A descrição vazia apaga. */
    public UserList with(String newName, String newDescription, Boolean newRanked, ListVisibility newVisibility)
    {
        return new UserList(id, ownerId, newName != null ? newName : name, newDescription != null ? newDescription : description,
                newRanked != null ? newRanked : ranked, newVisibility != null ? newVisibility : visibility, createdAt, updatedAt);
    }
}
