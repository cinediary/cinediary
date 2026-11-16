package com.cinediary.api.modules.users.infrastructure.clerk.payload;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import tools.jackson.databind.JsonNode;

/** Envelope de evento do Clerk: {@code timestamp} em epoch millis. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WebhookEvent(String type, String object, long timestamp, JsonNode data)
{
}
