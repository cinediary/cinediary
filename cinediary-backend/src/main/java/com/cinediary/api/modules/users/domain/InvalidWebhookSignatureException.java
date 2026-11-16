package com.cinediary.api.modules.users.domain;

import com.cinediary.api.shared.domain.DomainException;

public class InvalidWebhookSignatureException extends DomainException
{
    public InvalidWebhookSignatureException(String message)
    {
        super(message);
    }
}
