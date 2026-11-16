package com.cinediary.api.shared.domain;

/** Base das exceções de negócio (sem dependência de framework). */
public abstract class DomainException extends RuntimeException
{
    protected DomainException(String message)
    {
        super(message);
    }

    protected DomainException(String message, Throwable cause)
    {
        super(message, cause);
    }
}
