package com.cinediary.api.modules.social.infrastructure.push;

import com.cinediary.api.modules.social.domain.PushMessage;
import com.cinediary.api.modules.social.domain.PushSenderPort;
import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * {@code POST /push/send} da Expo, em lotes de até 100 (o limite do serviço). A resposta traz um "ticket" por
 * mensagem, na mesma ordem: {@code DeviceNotRegistered} quer dizer que o token não vale mais.
 */
@Slf4j
@Component
class ExpoPushClient implements PushSenderPort
{
    private static final int BATCH = 100;

    private final RestClient rest;
    private final String url;

    ExpoPushClient(RestClient.Builder builder, PushProperties props)
    {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(props.connectTimeout()).build());
        factory.setReadTimeout(props.readTimeout());
        RestClient.Builder b = builder.requestFactory(factory);
        if (props.accessToken() != null && !props.accessToken().isBlank()) {
            b = b.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.accessToken().strip());
        }
        this.rest = b.build();
        this.url = props.expoUrl();
    }

    private record ExpoMessage(String to, String body, Map<String, String> data, String sound)
    {
    }

    private record Details(String error)
    {
    }

    private record Ticket(String status, String message, Details details)
    {
    }

    private record Response(List<Ticket> data)
    {
    }

    @Override
    public List<String> send(List<PushMessage> messages)
    {
        List<String> rejected = new ArrayList<>();
        for (int from = 0; from < messages.size(); from += BATCH) {
            List<PushMessage> batch = messages.subList(from, Math.min(from + BATCH, messages.size()));
            try {
                Response response = rest.post().uri(url)
                        .contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON)
                        .body(batch.stream().map(m -> new ExpoMessage(m.to(), m.body(), m.data(), "default")).toList())
                        .retrieve().body(Response.class);
                List<Ticket> tickets = response == null || response.data() == null ? List.of() : response.data();
                for (int i = 0; i < Math.min(tickets.size(), batch.size()); i++) {
                    Ticket t = tickets.get(i);
                    if ("error".equals(t.status()) && t.details() != null && "DeviceNotRegistered".equals(t.details().error())) {
                        rejected.add(batch.get(i).to());
                    } else if ("error".equals(t.status())) {
                        log.warn("Push recusado pela Expo: {}", t.message());
                    }
                }
            } catch (RestClientException e) {
                // Melhor esforço: sem reenvio (reenviar o lote poderia repetir pushes que já chegaram)
                log.warn("Falha ao mandar {} push(es) pela Expo: {}", batch.size(), e.getMessage());
            }
        }
        return rejected;
    }
}
