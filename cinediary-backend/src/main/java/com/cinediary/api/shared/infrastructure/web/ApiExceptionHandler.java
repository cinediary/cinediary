package com.cinediary.api.shared.infrastructure.web;

import com.cinediary.api.shared.domain.AccountDeletedException;
import com.cinediary.api.shared.domain.ConflictException;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Erros de domínio no formato RFC 9457 (application/problem+json), mensagens em PT-BR. */
@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler
{
    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException ex)
    {
        return problem(HttpStatus.NOT_FOUND, "Não encontrado", ex.getMessage());
    }

    @ExceptionHandler(AccountDeletedException.class)
    ProblemDetail accountDeleted(AccountDeletedException ex)
    {
        return problem(HttpStatus.FORBIDDEN, "Conta removida", ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    ProblemDetail forbidden(ForbiddenException ex)
    {
        return problem(HttpStatus.FORBIDDEN, "Acesso negado", ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail conflict(ConflictException ex)
    {
        return problem(HttpStatus.CONFLICT, "Conflito", ex.getMessage());
    }

    @ExceptionHandler({DomainValidationException.class, IllegalArgumentException.class})
    ProblemDetail badRequest(RuntimeException ex)
    {
        return problem(HttpStatus.BAD_REQUEST, "Requisição inválida", ex.getMessage());
    }

    @ExceptionHandler(ExternalServiceUnavailableException.class)
    ProblemDetail externalUnavailable(ExternalServiceUnavailableException ex)
    {
        log.warn("Serviço externo indisponível: {}", ex.getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "Serviço externo indisponível", ex.getMessage());
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail)
    {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(title);
        return pd;
    }
}
