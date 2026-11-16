package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.modules.users.domain.Pronouns;
import com.cinediary.api.modules.users.domain.Usernames;
import com.cinediary.api.shared.domain.ConflictException;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.Locale;
import java.util.UUID;
import com.cinediary.api.modules.users.api.UserSyncedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** PATCH /me: @username, nome, foto, privacidade e os 4 favoritos. */
@Service
@RequiredArgsConstructor
public class UpdateUserProfileUseCase
{
    private final UserRepositoryPort users;
    private final DiaryModulePort diary;
    private final UsersModuleFacade facade;
    private final ApplicationEventPublisher events;

    @Transactional
    public UserProfileView execute(UUID userId, UpdateProfileCommand cmd)
    {
        UserAccount user = users.findById(userId).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));

        String username = user.username();
        if (cmd.username() != null) {
            username = cmd.username().strip().toLowerCase(Locale.ROOT);
            if (username.startsWith("@")) {
                username = username.substring(1);
            }
            if (!Usernames.isValid(username) || Usernames.isPlaceholder(username)) {
                throw new DomainValidationException("O @username deve ter 3 a 30 letras minúsculas, números, _ ou .");
            }
            if (!username.equals(user.username()) && users.usernameTakenByAnother(username, user.clerkId())) {
                throw new ConflictException("Esse @username já está em uso");
            }
        }
        String displayName = user.displayName();
        if (cmd.displayName() != null) {
            displayName = cmd.displayName().strip();
            if (displayName.isEmpty() || displayName.length() > 100) {
                throw new DomainValidationException("O nome deve ter de 1 a 100 caracteres");
            }
        }
        String avatarUrl = user.avatarUrl();
        if (cmd.avatarUrl() != null) {
            avatarUrl = cmd.avatarUrl().isBlank() ? null : cmd.avatarUrl().strip();
            if (avatarUrl != null && !avatarUrl.matches("https?://\\S+")) {
                throw new DomainValidationException("A foto precisa ser uma URL http(s)");
            }
        }
        boolean isPrivate = cmd.isPrivate() != null ? cmd.isPrivate() : user.privateProfile();

        users.updateProfile(userId, username, displayName, avatarUrl, isPrivate);
        users.updateDetails(userId,
                text(cmd.firstName(), user.firstName(), 100, "O nome"),
                text(cmd.lastName(), user.lastName(), 100, "O sobrenome"),
                text(cmd.bio(), user.bio(), 200, "A bio"),
                pronouns(cmd.pronouns(), user.pronouns()),
                cmd.showSpoilers() != null ? cmd.showSpoilers() : user.showSpoilers(),
                cmd.defaultReplyPolicy() != null ? cmd.defaultReplyPolicy() : user.defaultReplyPolicy());
        if (cmd.favoriteTitleIds() != null) {
            diary.setFavorites(userId, cmd.favoriteTitleIds());
        }
        events.publishEvent(new UserSyncedEvent(userId));
        return facade.profile(userId, userId);
    }

    /** null = mantém; vazio = apaga; senão o texto sem espaços nas pontas (bio mantém as quebras de linha). */
    private static String text(String incoming, String current, int max, String label)
    {
        if (incoming == null) {
            return current;
        }
        String v = incoming.strip();
        if (v.length() > max) {
            throw new DomainValidationException(label + " pode ter até " + max + " caracteres");
        }
        return v.isEmpty() ? null : v;
    }

    /** null = mantém; vazio = não mostrar; senão um dos códigos da lista ({@link Pronouns}). */
    private static String pronouns(String incoming, String current)
    {
        if (incoming == null) {
            return current;
        }
        String v = incoming.strip();
        if (v.isEmpty()) {
            return null;
        }
        if (!Pronouns.isValid(v)) {
            throw new DomainValidationException("Pronomes: escolha uma das opções");
        }
        return v;
    }
}
