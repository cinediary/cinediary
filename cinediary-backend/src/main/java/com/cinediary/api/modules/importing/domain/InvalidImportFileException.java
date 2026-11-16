package com.cinediary.api.modules.importing.domain;

import com.cinediary.api.shared.domain.DomainValidationException;

public class InvalidImportFileException extends DomainValidationException
{
    public InvalidImportFileException(String message)
    {
        super(message);
    }
}
