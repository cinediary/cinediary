package com.cinediary.api.shared.infrastructure.web;

import com.cinediary.api.shared.domain.ContentLanguage;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Lê o {@code Accept-Language} de cada pedido e deixa o idioma em {@link ContentLanguage#current()}. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class ContentLanguageFilter extends OncePerRequestFilter
{
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException
    {
        ContentLanguage.set(ContentLanguage.fromHeader(request.getHeader(HttpHeaders.ACCEPT_LANGUAGE)));
        try {
            chain.doFilter(request, response);
        } finally {
            ContentLanguage.clear();
        }
    }
}
