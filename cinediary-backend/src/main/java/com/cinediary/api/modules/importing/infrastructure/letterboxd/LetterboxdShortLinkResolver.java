package com.cinediary.api.modules.importing.infrastructure.letterboxd;

import com.cinediary.api.modules.importing.domain.LetterboxdFilmRef;
import com.cinediary.api.modules.importing.domain.LetterboxdLinkPort;
import com.cinediary.api.modules.importing.infrastructure.config.ImportingProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Segue UM redirecionamento do link curto (boxd.it → letterboxd.com/film/<slug>/) e lê só o endereço de
 * destino: a página do Letterboxd não é baixada nem lida. Proteções: só links https://boxd.it/<código>
 * entram (o código é reenviado ao host configurado, nunca a URL vinda do arquivo), redirecionamentos não
 * são seguidos sozinhos e só um destino de página de filme é aceito.
 */
@Slf4j
@Component
class LetterboxdShortLinkResolver implements LetterboxdLinkPort
{
    private static final Pattern SHORT_LINK = Pattern.compile("^https?://boxd\\.it/([A-Za-z0-9]{1,16})/?$");
    private static final Duration TIMEOUT = Duration.ofSeconds(4);

    private final String baseUrl;
    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(TIMEOUT)
            .build();

    LetterboxdShortLinkResolver(ImportingProperties props)
    {
        this.baseUrl = props.shortLinkBaseUrl() == null || props.shortLinkBaseUrl().isBlank()
                ? "https://boxd.it" : props.shortLinkBaseUrl().replaceAll("/+$", "");
    }

    @Override
    public Optional<LetterboxdFilmRef> resolve(String shortLink)
    {
        Matcher m = shortLink == null ? null : SHORT_LINK.matcher(shortLink.strip());
        if (m == null || !m.matches()) {
            return Optional.empty();
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/" + m.group(1)))
                    .timeout(TIMEOUT)
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<Void> response = http.send(request, HttpResponse.BodyHandlers.discarding());
            return response.headers().firstValue("location").flatMap(LetterboxdFilmRef::fromFilmUrl);
        } catch (IOException | IllegalArgumentException e) {
            log.warn("Link do Letterboxd {} não resolvido: {}", shortLink, e.getMessage());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }
}
