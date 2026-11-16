package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import com.cinediary.api.modules.users.api.UserDeletedEvent;
import com.cinediary.api.modules.users.api.UserSyncedEvent;
import com.cinediary.api.modules.users.api.UsersModulePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Reage ao módulo users pelo Outbox (Spring Modulith), sem o users depender do social. */
@Slf4j
@Component
@RequiredArgsConstructor
class SocialEventListener
{
    private final FollowRepositoryPort follows;
    private final UsersModulePort users;
    private final NotificationsPort notifications;

    /** Perfil virou público: quem tinha pedido passa a seguir. */
    @ApplicationModuleListener
    void on(UserSyncedEvent event)
    {
        users.findById(event.userId()).filter(u -> !u.isPrivate()).ifPresent(u -> {
            int accepted = follows.acceptAllPendingOf(u.id());
            if (accepted > 0) {
                notifications.requestsAccepted(u.id(), null);
                log.info("Perfil {} ficou público: {} pedidos de seguir aprovados", u.id(), accepted);
            }
        });
    }

    @ApplicationModuleListener
    void on(UserDeletedEvent event)
    {
        follows.deleteAllOf(event.userId());
    }
}
