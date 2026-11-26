package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import com.cinediary.api.modules.social.domain.PushMessage;
import com.cinediary.api.modules.social.domain.PushSenderPort;
import com.cinediary.api.modules.users.api.PushCategory;
import com.cinediary.api.modules.users.api.PushDeviceView;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.ContentLanguage;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Manda o push de um aviso novo do sino para os aparelhos da pessoa (#13), depois do commit e fora do pedido
 * (assíncrono, pelo Outbox). Cada aparelho recebe o texto no próprio idioma. Curtidas no mesmo registro ou lista
 * em poucos minutos mandam só o primeiro push (o sino continua mostrando todas). Os tipos desligados nas
 * configurações (#15) não mandam push. Os tokens que o serviço recusa saem da lista de aparelhos.
 */
@Component
@RequiredArgsConstructor
class PushNotificationsListener
{
    /** Depois de um push de curtida, as outras curtidas no mesmo registro ou lista nesse tempo não mandam outro. */
    static final Duration LIKES_WINDOW = Duration.ofMinutes(10);

    private final UsersModulePort users;
    private final DiaryModulePort diary;
    private final NotificationsPort notifications;
    private final PushSenderPort sender;

    @ApplicationModuleListener
    void on(NotificationCreatedEvent event)
    {
        List<PushDeviceView> devices = users.pushDevices(event.recipientId());
        if (devices.isEmpty() || !users.pushPreferences(event.recipientId()).allows(category(event.kind())) || isLikeBurst(event)) {
            return; // sem aparelho, desligou esse tipo nas configurações (#15) ou já mandou o push dessa curtida
        }
        Optional<UserView> actor = users.findById(event.actorId());
        String list = event.listId() == null ? null : notifications.listName(event.listId()).orElse(null);
        if (actor.isEmpty() || (event.listId() != null && list == null)) {
            return; // conta excluída ou lista apagada antes do push sair
        }
        String name = actor.get().displayName() == null || actor.get().displayName().isBlank()
                ? actor.get().username() : actor.get().displayName();
        Map<String, String> data = data(event, actor.get());

        List<PushMessage> messages = new ArrayList<>();
        Map<String, List<PushDeviceView>> byLanguage = devices.stream()
                .collect(Collectors.groupingBy(PushDeviceView::language, LinkedHashMap::new, Collectors.toList()));
        for (var group : byLanguage.entrySet()) {
            ContentLanguage language = ContentLanguage.fromCode(group.getKey());
            String title = null;
            if (event.entryId() != null) {
                Optional<DiaryEntryView> entry = entryIn(language, event);
                if (entry.isEmpty()) {
                    return; // o registro foi apagado
                }
                title = entry.get().title().titlePt();
            }
            String body = PushTexts.of(language, event.kind(), name, title, list);
            group.getValue().forEach(d -> messages.add(new PushMessage(d.token(), body, data)));
        }

        List<String> rejected = sender.send(messages);
        if (!rejected.isEmpty()) {
            users.removePushTokens(rejected);
        }
    }

    private static PushCategory category(NotificationKind kind)
    {
        return switch (kind) {
            case FOLLOWED, FOLLOW_REQUESTED, FOLLOW_APPROVED -> PushCategory.FOLLOWERS;
            case ENTRY_LIKED, LIST_LIKED -> PushCategory.LIKES;
            case ENTRY_REPLIED -> PushCategory.REPLIES;
            case ENTRY_COMPANION -> PushCategory.COMPANIONS;
        };
    }

    private boolean isLikeBurst(NotificationCreatedEvent event)
    {
        UUID target = switch (event.kind()) {
            case ENTRY_LIKED -> event.entryId();
            case LIST_LIKED -> event.listId();
            default -> null;
        };
        return target != null && notifications.likedByOthersSince(event.recipientId(), event.kind(), target,
                event.actorId(), Instant.now().minus(LIKES_WINDOW));
    }

    /** O título do registro no idioma do aparelho (o catálogo lê o idioma de {@link ContentLanguage#current()}). */
    private Optional<DiaryEntryView> entryIn(ContentLanguage language, NotificationCreatedEvent event)
    {
        ContentLanguage.set(language);
        try {
            return diary.entriesByIds(List.of(event.entryId()), event.recipientId()).stream().findFirst();
        } finally {
            ContentLanguage.clear();
        }
    }

    /** O que o app usa para abrir a tela certa ao tocar no push (#16). */
    private static Map<String, String> data(NotificationCreatedEvent event, UserView actor)
    {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("kind", event.kind().name());
        data.put("username", actor.username());
        if (event.entryId() != null) {
            data.put("entryId", event.entryId().toString());
        }
        if (event.listId() != null) {
            data.put("listId", event.listId().toString());
        }
        return data;
    }

}
