package com.cinediary.api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Serviço de push da Expo falso (#13): guarda o que recebeu e responde um ticket por mensagem. Um token com
 * "Dead" no nome responde {@code DeviceNotRegistered}, como um app desinstalado.
 */
public final class FakeExpoPush
{
    public record Sent(String to, String body, Map<String, String> data)
    {
    }

    private static final ObjectMapper JSON = new ObjectMapper();

    private final HttpServer server;
    private final List<Sent> sent = new CopyOnWriteArrayList<>();

    private FakeExpoPush(HttpServer server)
    {
        this.server = server;
    }

    public static FakeExpoPush start()
    {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            FakeExpoPush fake = new FakeExpoPush(server);
            server.createContext("/push/send", fake::handle);
            server.start();
            return fake;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public String url()
    {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/push/send";
    }

    /** O que chegou para este token, na ordem. */
    public List<Sent> sentTo(String token)
    {
        return sent.stream().filter(s -> s.to().equals(token)).toList();
    }

    private void handle(HttpExchange ex) throws IOException
    {
        JsonNode messages = JSON.readTree(ex.getRequestBody().readAllBytes());
        StringBuilder tickets = new StringBuilder();
        for (JsonNode m : messages) {
            Map<String, String> data = new java.util.LinkedHashMap<>();
            m.path("data").properties().forEach(e -> data.put(e.getKey(), e.getValue().asString()));
            String to = m.path("to").asString();
            sent.add(new Sent(to, m.path("body").asString(), data));
            if (!tickets.isEmpty()) {
                tickets.append(',');
            }
            tickets.append(to.contains("Dead")
                    ? "{\"status\":\"error\",\"message\":\"not registered\",\"details\":{\"error\":\"DeviceNotRegistered\"}}"
                    : "{\"status\":\"ok\",\"id\":\"ticket\"}");
        }
        byte[] body = ("{\"data\":[" + tickets + "]}").getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.sendResponseHeaders(200, body.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(body);
        }
    }
}
