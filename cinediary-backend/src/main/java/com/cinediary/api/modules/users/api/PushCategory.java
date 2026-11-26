package com.cinediary.api.modules.users.api;

/** Os tipos de push que a pessoa liga ou desliga nas configurações (#15). */
public enum PushCategory
{
    /** Começou a te seguir, pediu para seguir, aceitou seu pedido. */
    FOLLOWERS,
    /** Curtidas nos seus registros e listas. */
    LIKES,
    /** Respostas nos seus registros. */
    REPLIES,
    /** Te marcaram num registro ("vi com…"). */
    COMPANIONS
}
