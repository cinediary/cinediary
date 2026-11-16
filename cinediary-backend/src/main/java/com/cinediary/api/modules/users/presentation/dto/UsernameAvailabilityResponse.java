package com.cinediary.api.modules.users.presentation.dto;

/** {@code reason}: AVAILABLE | TAKEN | INVALID | RESERVED. */
public record UsernameAvailabilityResponse(String username, boolean available, String reason)
{
}
