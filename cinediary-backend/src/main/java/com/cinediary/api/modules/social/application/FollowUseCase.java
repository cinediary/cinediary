package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.api.FollowCreatedEvent;
import com.cinediary.api.modules.social.domain.Follow;
import com.cinediary.api.modules.social.domain.FollowPolicy;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.FollowStatus;
import com.cinediary.api.modules.social.domain.ActivityKind;
import com.cinediary.api.modules.social.domain.ActivityPort;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Seguir, deixar de seguir (ou cancelar o pedido) e responder aos pedidos de quem quer te seguir. */
@Service
@RequiredArgsConstructor
public class FollowUseCase
{
    private final SocialAccess access;
    private final FollowRepositoryPort follows;
    private final ApplicationEventPublisher events;
    private final NotificationsPort notifications;
    private final ActivityPort activity;

    /** Perfil público: passa a seguir. Privado: vira pedido (REQUESTED). Repetir não muda nada. */
    @Transactional
    public Relationship follow(UUID viewerId, String username)
    {
        UserView person = access.person(username);
        if (person.id().equals(viewerId)) {
            throw new DomainValidationException("Você não pode seguir a si mesmo");
        }
        boolean existed = follows.find(viewerId, person.id()).isPresent();
        Follow saved = follows.insertIfAbsent(viewerId, person.id(), FollowPolicy.statusForNewFollow(person.isPrivate()));
        if (!existed) {
            boolean pending = saved.status() == FollowStatus.PENDING;
            notifications.add(person.id(), viewerId, pending ? NotificationKind.FOLLOW_REQUESTED : NotificationKind.FOLLOWED, null, null);
            if (!pending) {
                activity.add(viewerId, ActivityKind.FOLLOWED, person.id(), null, null);
            }
            events.publishEvent(new FollowCreatedEvent(viewerId, person.id(), pending));
        }
        return access.relationship(viewerId, person.id());
    }

    /** Deixa de seguir ou desiste do pedido. */
    @Transactional
    public Relationship unfollow(UUID viewerId, String username)
    {
        UserView person = access.person(username);
        follows.delete(viewerId, person.id());
        // Desistiu do pedido: o aviso some do sino de quem ia aprovar.
        notifications.remove(person.id(), viewerId, NotificationKind.FOLLOW_REQUESTED, null);
        activity.remove(viewerId, ActivityKind.FOLLOWED, person.id(), null);
        return access.relationship(viewerId, person.id());
    }

    @Transactional
    public void approve(UUID ownerId, UUID requesterId)
    {
        if (follows.accept(requesterId, ownerId)) {
            notifications.requestsAccepted(ownerId, requesterId);
            notifications.add(requesterId, ownerId, NotificationKind.FOLLOW_APPROVED, null, null);
            activity.add(requesterId, ActivityKind.FOLLOWED, ownerId, null, null);
            events.publishEvent(new FollowCreatedEvent(requesterId, ownerId, false));
        }
    }

    /** Recusa um pedido ou tira alguém dos seus seguidores (a pessoa não é avisada). */
    @Transactional
    public void removeFollower(UUID ownerId, UUID followerId)
    {
        follows.delete(followerId, ownerId);
        notifications.remove(ownerId, followerId, NotificationKind.FOLLOW_REQUESTED, null);
        activity.remove(followerId, ActivityKind.FOLLOWED, ownerId, null);
    }
}
