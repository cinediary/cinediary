package com.cinediary.api.modules.importing.domain;

public enum ImportJobStatus
{
    PARSING,
    AWAITING_CONFIRMATION,
    APPLYING,
    COMPLETED,
    FAILED
}
