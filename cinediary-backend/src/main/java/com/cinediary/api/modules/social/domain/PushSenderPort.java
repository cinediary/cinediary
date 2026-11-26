package com.cinediary.api.modules.social.domain;

import java.util.List;

/** O serviço que entrega o push nos aparelhos (o da Expo). */
public interface PushSenderPort
{
    /**
     * Manda os pushes e devolve os tokens que o serviço recusou por não valerem mais (o app foi desinstalado, por
     * exemplo), para tirá-los. Falhas de rede não sobem: o push é o melhor esforço, o aviso continua no sino.
     */
    List<String> send(List<PushMessage> messages);
}
