package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.EntryAccessView;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.FollowStatus;
import com.cinediary.api.modules.social.domain.ActivityKind;
import com.cinediary.api.modules.social.domain.ActivityPort;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import com.cinediary.api.modules.social.domain.ReplyRules;
import com.cinediary.api.shared.domain.ReplyPolicy;
import com.cinediary.api.modules.social.api.EntryInteractionEvent;
import com.cinediary.api.modules.social.domain.EntryComment;
import com.cinediary.api.modules.social.domain.EntryInteractionsPort;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Curtir e responder entradas do diário (suas e de outras pessoas). Só quem pode ver a entrada interage:
 * o dono, todos (perfil público) ou quem segue aprovado (perfil privado). Responder também depende de "quem pode
 * responder" (da entrada ou o padrão da conta do dono: só o dono, quem ele segue ou qualquer pessoa).
 */
@Service
@RequiredArgsConstructor
public class EntryInteractionsUseCase
{
    private final DiaryModulePort diary;
    private final UsersModulePort users;
    private final SocialAccess access;
    private final EntryInteractionsPort interactions;
    private final FollowRepositoryPort follows;
    private final NotificationsPort notifications;
    private final ActivityPort activity;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public EntryInteractions summary(UUID entryId, UUID viewerId)
    {
        return current(entryId, viewerId, context(entryId, viewerId));
    }

    @Transactional
    public EntryInteractions like(UUID entryId, UUID viewerId)
    {
        Ctx ctx = context(entryId, viewerId);
        requireInteractive(ctx);
        if (interactions.like(entryId, viewerId) && !ctx.ownerId().equals(viewerId)) {
            notifications.add(ctx.ownerId(), viewerId, NotificationKind.ENTRY_LIKED, entryId, null);
            activity.add(viewerId, ActivityKind.LIKED_ENTRY, ctx.ownerId(), entryId, null);
            events.publishEvent(new EntryInteractionEvent(EntryInteractionEvent.Kind.LIKED, entryId, ctx.ownerId(), viewerId, null));
        }
        return current(entryId, viewerId, ctx);
    }

    @Transactional
    public EntryInteractions unlike(UUID entryId, UUID viewerId)
    {
        Ctx ctx = context(entryId, viewerId);
        if (interactions.unlike(entryId, viewerId)) {
            notifications.remove(ctx.ownerId(), viewerId, NotificationKind.ENTRY_LIKED, entryId);
            activity.remove(viewerId, ActivityKind.LIKED_ENTRY, ctx.ownerId(), entryId);
        }
        return current(entryId, viewerId, ctx);
    }

    @Transactional(readOnly = true)
    public List<CommentItem> comments(UUID entryId, UUID viewerId)
    {
        UUID owner = visibleOwner(entryId, viewerId);
        List<EntryComment> list = interactions.comments(entryId);
        Map<UUID, UserView> authors = new HashMap<>();
        users.findByIds(list.stream().map(EntryComment::authorId).distinct().toList()).forEach(u -> authors.put(u.id(), u));
        return list.stream()
                .filter(c -> authors.containsKey(c.authorId())) // conta excluída: a resposta some junto
                .map(c -> new CommentItem(c, authors.get(c.authorId()), c.canBeDeletedBy(viewerId, owner), c.canBeEditedBy(viewerId)))
                .toList();
    }

    @Transactional
    public CommentItem comment(UUID entryId, UUID viewerId, String text)
    {
        Ctx ctx = context(entryId, viewerId);
        requireInteractive(ctx);
        if (!ctx.canReply()) {
            throw new ForbiddenException(switch (ctx.policy()) {
                case ME -> "Só quem registrou pode responder";
                case FOLLOWING -> "Só quem a pessoa segue pode responder";
                case EVERYONE -> "Você não pode responder";
            });
        }
        UUID owner = ctx.ownerId();
        String body = validBody(text);
        EntryComment saved = interactions.addComment(entryId, viewerId, body);
        notifications.add(owner, viewerId, NotificationKind.ENTRY_REPLIED, entryId, saved.id());
        activity.add(viewerId, ActivityKind.REPLIED_ENTRY, owner, entryId, saved.id());
        if (!owner.equals(viewerId)) {
            events.publishEvent(new EntryInteractionEvent(EntryInteractionEvent.Kind.COMMENTED, entryId, owner, viewerId, saved.id()));
        }
        UserView author = users.findById(viewerId).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return new CommentItem(saved, author, true, true);
    }

    /**
     * Editar uma resposta: só quem escreveu, com as mesmas regras do texto de quando ela foi escrita. Não depende da
     * regra de quem pode responder (a resposta já existe) e não gera aviso de novo; o sino mostra o texto novo.
     */
    @Transactional
    public CommentItem editComment(UUID entryId, UUID commentId, UUID viewerId, String text)
    {
        UUID owner = visibleOwner(entryId, viewerId);
        EntryComment c = interactions.findComment(commentId)
                .filter(x -> x.entryId().equals(entryId))
                .orElseThrow(() -> new NotFoundException("Resposta não encontrada"));
        if (!c.canBeEditedBy(viewerId)) {
            throw new ForbiddenException("Só quem escreveu pode editar a resposta");
        }
        String body = validBody(text);
        // Sem mudança: não marca como editada.
        EntryComment saved = body.equals(c.body()) ? c : interactions.editComment(commentId, body);
        UserView author = users.findById(viewerId).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return new CommentItem(saved, author, saved.canBeDeletedBy(viewerId, owner), true);
    }

    private static String validBody(String text)
    {
        String body = text == null ? "" : text.strip();
        if (body.isEmpty() || body.length() > EntryComment.MAX_LENGTH) {
            throw new DomainValidationException("A resposta precisa ter de 1 a " + EntryComment.MAX_LENGTH + " caracteres");
        }
        return body;
    }

    @Transactional
    public void deleteComment(UUID entryId, UUID commentId, UUID viewerId)
    {
        UUID owner = visibleOwner(entryId, viewerId);
        EntryComment c = interactions.findComment(commentId)
                .filter(x -> x.entryId().equals(entryId))
                .orElseThrow(() -> new NotFoundException("Resposta não encontrada"));
        if (!c.canBeDeletedBy(viewerId, owner)) {
            throw new ForbiddenException("Só quem escreveu ou o dono do registro pode apagar");
        }
        notifications.removeByComment(commentId);
        activity.removeByComment(commentId);
        interactions.deleteComment(commentId);
    }

    private EntryInteractions current(UUID entryId, UUID viewerId, Ctx ctx)
    {
        return new EntryInteractions(interactions.countLikes(entryId), interactions.likedBy(entryId, viewerId),
                interactions.countComments(entryId), ctx.policy(), ctx.canReply(), ctx.interactive());
    }

    /** "Só assistido" (sem review) tem tela própria, mas não recebe curtidas nem respostas. */
    private static void requireInteractive(Ctx ctx)
    {
        if (!ctx.interactive()) {
            throw new DomainValidationException("Só registros com review recebem curtidas e respostas");
        }
    }

    /** A entrada para quem vê: o dono, a regra de respostas que vale e se ele pode responder. */
    /** {@code interactive}: tem review (só registros com review recebem curtidas e respostas). */
    private record Ctx(UUID ownerId, ReplyPolicy policy, boolean canReply, boolean interactive)
    {
    }

    /** 404 se a entrada não existe; 403 se é de um perfil privado que quem vê não segue. */
    private Ctx context(UUID entryId, UUID viewerId)
    {
        EntryAccessView entry = diary.entryAccess(entryId).orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        UserView owner = users.findById(entry.ownerId()).orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        boolean isOwner = Objects.equals(owner.id(), viewerId);
        if (!isOwner && !access.canSeeContent(viewerId, owner)) {
            throw new ForbiddenException("Este perfil é privado");
        }
        ReplyPolicy policy = ReplyRules.effective(entry.replyPolicy(), owner.defaultReplyPolicy());
        boolean ownerFollowsViewer = !isOwner && policy == ReplyPolicy.FOLLOWING
                && follows.find(owner.id(), viewerId).filter(f -> f.status() == FollowStatus.ACCEPTED).isPresent();
        return new Ctx(owner.id(), policy, entry.hasReview() && ReplyRules.canReply(policy, isOwner, ownerFollowsViewer),
                entry.hasReview());
    }

    private UUID visibleOwner(UUID entryId, UUID viewerId)
    {
        return context(entryId, viewerId).ownerId();
    }
}
