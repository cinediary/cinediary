package com.cinediary.api.modules.users.domain;

import java.time.Instant;

/** Evento de usuário do Clerk já verificado (assinatura Svix) e convertido. */
public record ClerkUserEvent(String type, Instant eventTimestamp, String clerkId, String username, String firstName,
                             String lastName, String email, String imageUrl, Instant updatedAt)
{
}
