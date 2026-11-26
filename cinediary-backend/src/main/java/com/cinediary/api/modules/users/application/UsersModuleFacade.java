package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.users.api.PushDeviceView;
import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.modules.users.domain.PushDevicesPort;
import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsersModuleFacade implements UsersModulePort
{
    private final UserRepositoryPort users;
    private final DiaryModulePort diary;
    private final CatalogModulePort catalog;
    private final PushDevicesPort pushDevices;

    @Override
    public Optional<UserView> findById(UUID userId)
    {
        return users.findById(userId).filter(u -> !u.deleted()).map(UsersModuleFacade::toView);
    }

    @Override
    public List<UserView> findByIds(Collection<UUID> userIds)
    {
        return users.findByIds(userIds).stream().filter(u -> !u.deleted()).map(UsersModuleFacade::toView).toList();
    }

    @Override
    public Optional<UserView> findByUsername(String username)
    {
        return users.findActiveByUsername(username).map(UsersModuleFacade::toView);
    }

    @Override
    public List<UserView> findByUsernames(Collection<String> usernames)
    {
        return usernames.isEmpty() ? List.of()
                : users.findActiveByUsernames(usernames).stream().map(UsersModuleFacade::toView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserView> search(String query, int limit)
    {
        String q = query == null ? "" : query.strip().replaceFirst("^@", "");
        if (q.length() < 2) {
            return List.of();
        }
        return users.search(q, Math.clamp(limit, 1, 50)).stream().map(UsersModuleFacade::toView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileView profile(UUID userId, UUID viewerId)
    {
        UserAccount u = users.findById(userId).filter(x -> !x.deleted())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return new UserProfileView(u.id(), u.username(), u.displayName(), u.avatarUrl(), u.privateProfile(),
                u.onboardingCompleted(), diary.countWatched(userId, "MOVIE"), diary.countWatched(userId, "SERIES"),
                catalog.summaries(diary.favoriteTitleIds(userId), viewerId), u.bio(), u.pronouns(), u.firstName(),
                u.lastName(), u.showSpoilers(), u.defaultReplyPolicy().name(), u.approveCompanions(),
                u.headerTitleId() == null ? null : catalog.backdropUrl(u.headerBackdropPath()));
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Set<UUID> autoAcceptingCompanions(Collection<UUID> userIds)
    {
        return userIds.isEmpty() ? java.util.Set.of()
                : users.findByIds(userIds).stream().filter(u -> !u.approveCompanions()).map(UserAccount::id)
                        .collect(java.util.stream.Collectors.toSet());
    }

    static UserView toView(UserAccount u)
    {
        return new UserView(u.id(), u.username(), u.displayName(), u.avatarUrl(), u.privateProfile(),
                u.onboardingCompleted(), u.defaultReplyPolicy());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PushDeviceView> pushDevices(UUID userId)
    {
        return pushDevices.devicesOf(userId).stream().map(d -> new PushDeviceView(d.token(), d.language())).toList();
    }

    @Override
    @Transactional
    public void removePushTokens(Collection<String> tokens)
    {
        pushDevices.deleteTokens(tokens);
    }
}
