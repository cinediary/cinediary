package com.cinediary.api.modules.lists.presentation.dto;

import com.cinediary.api.modules.lists.domain.ListVisibility;
import com.cinediary.api.shared.domain.DomainValidationException;
import jakarta.validation.constraints.Size;

/**
 * Criar (POST) ou editar (PATCH) uma lista. No PATCH, o que não vier fica como está; descrição vazia apaga.
 * {@code visibility}: PUBLIC ou PRIVATE.
 */
public record ListRequest(@Size(max = 100) String name, @Size(max = 1000) String description, Boolean ranked,
                          String visibility)
{
    public ListVisibility visibilityOrNull()
    {
        if (visibility == null) {
            return null;
        }
        try {
            return ListVisibility.valueOf(visibility);
        } catch (IllegalArgumentException e) {
            throw new DomainValidationException("Visibilidade inválida: use PUBLIC ou PRIVATE");
        }
    }
}
