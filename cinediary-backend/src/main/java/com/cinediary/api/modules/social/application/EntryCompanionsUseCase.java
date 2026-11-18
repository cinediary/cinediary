package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.EntryAccessView;
import com.cinediary.api.modules.social.domain.CompanionStatus;
import com.cinediary.api.modules.social.domain.EntryCompanion;
import com.cinediary.api.modules.social.domain.EntryCompanionsPort;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Vi com…": o dono de um registro marca com quem assistiu. Só dá para marcar amigos (segue e é seguido, os dois
 * aprovados), para evitar spam. A pessoa marcada recebe um aviso e aceita (aparece no registro) ou recusa (some sem
 * avisar quem marcou); com "Aprovar marcações" desligado, já entra aceita. Depois de aceita, ela pode tirar a marcação.
 */
@Service
@RequiredArgsConstructor
public class EntryCompanionsUseCase
{
    private static final int FRIENDS_WINDOW = 500;
    private static final int FRIENDS_RESULTS = 20;

    private final DiaryModulePort diary;
    private final UsersModulePort users;
    private final SocialAccess access;
    private final EntryCompanionsPort companions;
    private final NotificationsPort notifications;

    @Transactional(readOnly = true)
    public EntryCompanions of(UUID entryId, UUID viewerId)
    {
        UUID ownerId = visibleOwner(entryId, viewerId);
        return current(entryId, viewerId, ownerId);
    }

    /** O dono define a lista inteira: quem entrou é marcado (e avisado); quem saiu perde a marcação. */
    @Transactional
    public EntryCompanions set(UUID entryId, UUID ownerId, List<String> usernames)
    {
        EntryAccessView entry = diary.entryAccess(entryId).orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        if (!entry.ownerId().equals(ownerId)) {
            throw new ForbiddenException("Só quem registrou pode marcar quem viu junto");
        }
        Set<String> wanted = (usernames == null ? List.<String>of() : usernames).stream()
                .filter(Objects::nonNull)
                .map(u -> u.strip().replaceFirst("^@", "").toLowerCase(Locale.ROOT))
                .filter(u -> !u.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (wanted.size() > EntryCompanion.MAX_PER_ENTRY) {
            throw new DomainValidationException("Dá para marcar até " + EntryCompanion.MAX_PER_ENTRY + " pessoas");
        }
        Map<UUID, EntryCompanion> existing = new HashMap<>();
        companions.ofEntry(entryId).forEach(c -> existing.put(c.companionId(), c));
        Set<UUID> friends = Set.copyOf(companions.mutualFriends(ownerId, FRIENDS_WINDOW));
        Set<UUID> wantedIds = new LinkedHashSet<>();
        for (String username : wanted) {
            UserView person = access.person(username);
            if (person.id().equals(ownerId)) {
                continue; // marcar a si mesmo não faz sentido
            }
            // Quem já está no registro continua (mesmo que a amizade tenha mudado); quem entra precisa ser amigo.
            if (!existing.containsKey(person.id()) && !friends.contains(person.id())) {
                throw new ForbiddenException("Só dá para marcar amigos (quem você segue e te segue)");
            }
            wantedIds.add(person.id());
        }

        for (UUID id : wantedIds) {
            if (!existing.containsKey(id)) {
                // "Aprovar marcações" desligado: já entra aceita (o aviso vira só informativo).
                if (users.approvesCompanions(id)) {
                    companions.add(entryId, id);
                } else {
                    companions.addAccepted(entryId, id);
                }
                notifications.add(id, ownerId, NotificationKind.ENTRY_COMPANION, entryId, null);
            }
        }
        for (UUID id : existing.keySet()) {
            if (!wantedIds.contains(id)) {
                companions.remove(entryId, id);
                notifications.remove(id, ownerId, NotificationKind.ENTRY_COMPANION, entryId);
            }
        }
        return current(entryId, ownerId, ownerId);
    }

    @Transactional
    public EntryCompanions accept(UUID entryId, UUID companionId)
    {
        UUID ownerId = pendingOrAccepted(entryId, companionId);
        companions.respond(entryId, companionId, CompanionStatus.ACCEPTED);
        return current(entryId, companionId, ownerId);
    }

    /** Recusar: o aviso some e a marcação não aparece para ninguém (quem marcou continua vendo "esperando"). */
    @Transactional
    public void decline(UUID entryId, UUID companionId)
    {
        UUID ownerId = pendingOrAccepted(entryId, companionId);
        companions.respond(entryId, companionId, CompanionStatus.DECLINED);
        notifications.remove(companionId, ownerId, NotificationKind.ENTRY_COMPANION, entryId);
    }

    /**
     * Quem foi marcado (e aceitou) registrou o mesmo título no próprio diário: o registro dele ganha "vi com" quem o
     * marcou, já aceito (sem aviso). Só quem marcou aparece, porque os outros marcados podem não ser amigos dele.
     */
    @Transactional
    public EntryCompanions linkOwnEntry(UUID sourceEntryId, UUID companionId, UUID ownEntryId)
    {
        EntryCompanion marking = companions.find(sourceEntryId, companionId)
                .filter(c -> c.status() == CompanionStatus.ACCEPTED)
                .orElseThrow(() -> new NotFoundException("Marcação não encontrada"));
        UUID markedBy = diary.entryAccess(marking.entryId()).map(EntryAccessView::ownerId)
                .orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        EntryAccessView own = diary.entryAccess(ownEntryId).orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        if (!own.ownerId().equals(companionId)) {
            throw new ForbiddenException("Esse registro não é seu");
        }
        Map<UUID, Long> titles = new HashMap<>();
        diary.entriesByIds(List.of(sourceEntryId, ownEntryId), companionId).forEach(e -> titles.put(e.id(), e.title().id()));
        if (!Objects.equals(titles.get(sourceEntryId), titles.get(ownEntryId))) {
            throw new DomainValidationException("Os dois registros precisam ser do mesmo título");
        }
        companions.addAccepted(ownEntryId, markedBy);
        return current(ownEntryId, companionId, companionId);
    }

    /** Tirar uma marcação já aceita (ou ainda esperando): igual a recusar. */
    @Transactional
    public void remove(UUID entryId, UUID companionId)
    {
        decline(entryId, companionId);
    }

    /** Amigos para o "Vi com…", filtrados pelo começo do @ ou do nome. */
    @Transactional(readOnly = true)
    public List<UserView> friends(UUID userId, String query)
    {
        String q = query == null ? "" : query.strip().replaceFirst("^@", "").toLowerCase(Locale.ROOT);
        return users.findByIds(companions.mutualFriends(userId, FRIENDS_WINDOW)).stream()
                .filter(u -> q.isEmpty() || u.username().toLowerCase(Locale.ROOT).startsWith(q)
                        || (u.displayName() != null && u.displayName().toLowerCase(Locale.ROOT).startsWith(q)))
                .limit(FRIENDS_RESULTS)
                .toList();
    }

    /**
     * Registros em que a pessoa aceitou ser marcada ("Marcações" do perfil). Precisa poder ver o perfil dela e cada
     * registro (o dono do registro pode ser um perfil privado que quem vê não segue).
     */
    @Transactional(readOnly = true)
    public List<DiaryEntryView> watchedWith(String username, UUID viewerId, int page, int size)
    {
        UserView person = access.person(username);
        if (!access.canSeeContent(viewerId, person)) {
            throw new ForbiddenException("Este perfil é privado");
        }
        List<UUID> order = companions.acceptedEntriesOf(person.id(), page, size);
        List<DiaryEntryView> entries = diary.entriesByIds(order, viewerId);
        Map<UUID, UserView> owners = new HashMap<>();
        users.findByIds(entries.stream().map(DiaryEntryView::userId).distinct().toList()).forEach(u -> owners.put(u.id(), u));
        return entries.stream()
                .filter(e -> owners.containsKey(e.userId()))
                .filter(e -> e.userId().equals(viewerId) || access.canSeeContent(viewerId, owners.get(e.userId())))
                .sorted(java.util.Comparator.comparingInt(e -> order.indexOf(e.id())))
                .toList();
    }

    private EntryCompanions current(UUID entryId, UUID viewerId, UUID ownerId)
    {
        boolean isOwner = ownerId.equals(viewerId);
        List<EntryCompanion> all = companions.ofEntry(entryId);
        Map<UUID, UserView> people = new HashMap<>();
        users.findByIds(all.stream().map(EntryCompanion::companionId).toList()).forEach(u -> people.put(u.id(), u));
        List<CompanionItem> visible = all.stream()
                .filter(c -> people.containsKey(c.companionId()))
                .filter(c -> isOwner || c.status() == CompanionStatus.ACCEPTED)
                .map(c -> new CompanionItem(people.get(c.companionId()),
                        c.status() == CompanionStatus.DECLINED ? CompanionStatus.PENDING : c.status()))
                .toList();
        CompanionStatus mine = all.stream().filter(c -> c.companionId().equals(viewerId)).map(EntryCompanion::status)
                .findFirst().orElse(null);
        return new EntryCompanions(visible, mine);
    }

    /** O dono do registro, se quem vê pode ver: o dono, a pessoa marcada ou quem pode ver o perfil do dono. */
    private UUID visibleOwner(UUID entryId, UUID viewerId)
    {
        EntryAccessView entry = diary.entryAccess(entryId).orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        UserView owner = users.findById(entry.ownerId()).orElseThrow(() -> new NotFoundException("Registro não encontrado"));
        boolean marked = companions.find(entryId, viewerId).isPresent();
        if (!owner.id().equals(viewerId) && !marked && !access.canSeeContent(viewerId, owner)) {
            throw new ForbiddenException("Este perfil é privado");
        }
        return owner.id();
    }

    /** A marcação de quem responde (esperando ou aceita); devolve o dono do registro. */
    private UUID pendingOrAccepted(UUID entryId, UUID companionId)
    {
        EntryCompanion c = companions.find(entryId, companionId)
                .filter(x -> x.status() != CompanionStatus.DECLINED)
                .orElseThrow(() -> new NotFoundException("Marcação não encontrada"));
        return diary.entryAccess(c.entryId()).map(EntryAccessView::ownerId)
                .orElseThrow(() -> new NotFoundException("Registro não encontrado"));
    }
}
