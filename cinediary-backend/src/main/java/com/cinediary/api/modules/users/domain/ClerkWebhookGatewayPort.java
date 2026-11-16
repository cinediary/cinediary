package com.cinediary.api.modules.users.domain;

/** Verifica a assinatura Svix e converte o payload do Clerk. */
public interface ClerkWebhookGatewayPort
{
    ClerkUserEvent verifyAndParse(String payload, String svixId, String svixTimestamp, String svixSignature);
}
