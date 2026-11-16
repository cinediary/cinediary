package com.cinediary.api.shared.domain;

public class AccountDeletedException extends DomainException
{
    public AccountDeletedException()
    {
        super("Esta conta foi removida");
    }
}
