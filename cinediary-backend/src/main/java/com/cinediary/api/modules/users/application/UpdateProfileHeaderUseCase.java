package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Capa do perfil: um backdrop do TMDB de um título do catálogo (como no Letterboxd), sem upload.
 * O caminho escolhido precisa estar entre os backdrops daquele título: assim a capa é sempre uma imagem do
 * TMDB, e não uma URL qualquer. Trocar ou remover não deixa nada para apagar (a imagem fica no TMDB).
 */
@Service
@RequiredArgsConstructor
public class UpdateProfileHeaderUseCase
{
    private final UserRepositoryPort users;
    private final CatalogModulePort catalog;
    private final UsersModuleFacade facade;

    @Transactional
    public UserProfileView set(UUID userId, long titleId, String backdropPath)
    {
        users.findById(userId).filter(u -> !u.deleted()).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        catalog.findTitle(titleId).orElseThrow(() -> new NotFoundException("Título não encontrado"));
        String path = backdropPath == null ? "" : backdropPath.strip();
        if (!catalog.backdropPaths(titleId).contains(path)) {
            throw new DomainValidationException("Escolha uma das imagens deste título");
        }
        if (!users.updateHeader(userId, titleId, path)) {
            throw new NotFoundException("Usuário não encontrado");
        }
        return facade.profile(userId, userId);
    }

    @Transactional
    public UserProfileView remove(UUID userId)
    {
        users.findById(userId).filter(u -> !u.deleted()).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        if (!users.updateHeader(userId, null, null)) {
            throw new NotFoundException("Usuário não encontrado");
        }
        return facade.profile(userId, userId);
    }
}
