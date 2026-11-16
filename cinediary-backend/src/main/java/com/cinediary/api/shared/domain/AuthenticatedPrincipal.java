package com.cinediary.api.shared.domain;

/**
 * Identidade vinda do token do Clerk ({@code sub} = clerkId), antes de virar usuário interno.
 * {@code username}, {@code name} e {@code imageUrl} só vêm se o session token do Clerk tiver esses claims.
 */
public record AuthenticatedPrincipal(String clerkId, String username, String name, String imageUrl)
{
}
