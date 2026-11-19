package com.cinediary.api.modules.users.infrastructure.persistence;

import com.cinediary.api.modules.users.domain.ClerkUserEvent;
import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class UserRepositoryAdapter implements UserRepositoryPort
{
    private final SpringDataUserRepository repository;

    @Override
    public Optional<UserAccount> findByClerkId(String clerkId)
    {
        return repository.findUserByClerkId(clerkId).map(UserRepositoryAdapter::toModel);
    }

    @Override
    public Optional<UserAccount> findById(UUID id)
    {
        return repository.findById(id).map(UserRepositoryAdapter::toModel);
    }

    @Override
    public List<UserAccount> findByIds(Collection<UUID> ids)
    {
        return repository.findAllById(ids).stream().map(UserRepositoryAdapter::toModel).toList();
    }

    @Override
    public Optional<UserAccount> findActiveByUsername(String username)
    {
        return repository.findByUsernameAndDeletedAtIsNull(username).map(UserRepositoryAdapter::toModel);
    }

    @Override
    public List<UserAccount> findActiveByUsernames(Collection<String> usernames)
    {
        return repository.findByUsernameInAndDeletedAtIsNull(usernames).stream().map(UserRepositoryAdapter::toModel).toList();
    }

    @Override
    public List<UserAccount> search(String query, int limit)
    {
        String escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return repository.search(query, escaped + "%", "%" + escaped + "%", limit).stream()
                .map(UserRepositoryAdapter::toModel).toList();
    }

    @Override
    public Optional<UserAccount> findAnyByUsername(String username)
    {
        return repository.findByUsername(username).map(UserRepositoryAdapter::toModel);
    }

    @Override
    public void replaceUsername(UUID id, String username)
    {
        repository.replaceUsername(id, username);
    }

    @Override
    public boolean usernameTakenByAnother(String username, String clerkId)
    {
        return repository.existsByUsernameAndClerkIdNot(username, clerkId);
    }

    @Override
    public void insertIfAbsent(String clerkId, String username, String displayName, String avatarUrl)
    {
        repository.insertIfAbsent(clerkId, username, displayName, avatarUrl);
    }

    @Override
    public int upsertIfNewer(ClerkUserEvent e, String username, String displayName)
    {
        return repository.upsertIfNewer(e.clerkId(), username, displayName, e.firstName(), e.lastName(), e.email(),
                e.imageUrl(), e.updatedAt(), e.eventTimestamp());
    }

    @Override
    public int softDeleteIfNewer(String clerkId, Instant eventTimestamp)
    {
        return repository.softDeleteIfNewer(clerkId, eventTimestamp, eventTimestamp);
    }

    @Override
    public int softDelete(UUID id)
    {
        return repository.softDelete(id);
    }

    @Override
    public void updateDetails(UUID id, String firstName, String lastName, String bio, String pronouns, boolean showSpoilers,
                              com.cinediary.api.shared.domain.ReplyPolicy defaultReplyPolicy, boolean approveCompanions)
    {
        UserJpaEntity e = repository.findById(id).orElseThrow();
        e.setFirstName(firstName);
        e.setLastName(lastName);
        e.setBio(bio);
        e.setPronouns(pronouns);
        e.setShowSpoilers(showSpoilers);
        e.setDefaultReplyPolicy(defaultReplyPolicy.name());
        e.setApproveCompanions(approveCompanions);
        e.setUpdatedAt(Instant.now());
        repository.save(e);
    }

    @Override
    public void updateProfile(UUID id, String username, String displayName, String avatarUrl, boolean privateProfile)
    {
        UserJpaEntity e = repository.findById(id).orElseThrow();
        e.setUsername(username);
        e.setDisplayName(displayName);
        e.setAvatarUrl(avatarUrl);
        e.setPrivateProfile(privateProfile);
        e.setUpdatedAt(Instant.now());
        repository.save(e);
    }

    @Override
    public void markOnboardingCompleted(UUID id)
    {
        UserJpaEntity e = repository.findById(id).orElseThrow();
        e.setOnboardingCompleted(true);
        e.setUpdatedAt(Instant.now());
        repository.save(e);
    }

    private static UserAccount toModel(UserJpaEntity e)
    {
        return new UserAccount(e.getId(), e.getClerkId(), e.getUsername(), e.getDisplayName(), e.getFirstName(),
                e.getLastName(), e.getEmail(), e.getAvatarUrl(), e.isPrivateProfile(), e.isOnboardingCompleted(),
                e.getDeletedAt() != null, e.getBio(), e.getPronouns(), e.isShowSpoilers(),
                com.cinediary.api.shared.domain.ReplyPolicy.valueOf(e.getDefaultReplyPolicy()), e.isApproveCompanions());
    }
}
