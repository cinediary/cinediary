package com.cinediary.api.shared.domain;

public class ExternalServiceUnavailableException extends DomainException
{
    public ExternalServiceUnavailableException(String message)
    {
        super(message);
    }

    public ExternalServiceUnavailableException(String message, Throwable cause)
    {
        super(message, cause);
    }
}
