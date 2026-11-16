package com.cinediary.api.modules.users.domain;

public interface ProcessedWebhookPort
{
    /** true se o svix-id ainda não tinha sido processado (idempotência). */
    boolean registerIfNew(String svixId, String eventType);
}
