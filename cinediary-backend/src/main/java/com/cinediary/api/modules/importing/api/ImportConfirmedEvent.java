package com.cinediary.api.modules.importing.api;

import java.util.UUID;

/** Importação do Letterboxd confirmada e gravada no diário. */
public record ImportConfirmedEvent(UUID userId, UUID jobId)
{
}
