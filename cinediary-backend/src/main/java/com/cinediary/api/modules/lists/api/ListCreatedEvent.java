package com.cinediary.api.modules.lists.api;

import java.util.UUID;

/** Alguém criou uma lista (o Spring Modulith grava o evento na mesma transação). */
public record ListCreatedEvent(UUID listId, UUID ownerId)
{
}
