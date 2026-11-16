package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Diário de outra pessoa (e uma entrada dele), respeitando o perfil privado. */
@Service
@RequiredArgsConstructor
public class GetPersonDiaryUseCase
{
    private final SocialAccess access;
    private final DiaryModulePort diary;

    @Transactional(readOnly = true)
    public List<DiaryEntryView> entries(String username, UUID viewerId, int page, int size)
    {
        return diary.entriesOf(visible(username, viewerId).id(), page, size, viewerId);
    }

    @Transactional(readOnly = true)
    public DiaryEntryView entry(String username, UUID entryId, UUID viewerId)
    {
        return diary.entryOf(visible(username, viewerId).id(), entryId, viewerId)
                .orElseThrow(() -> new NotFoundException("Registro não encontrado"));
    }

    private UserView visible(String username, UUID viewerId)
    {
        UserView person = access.person(username);
        if (!access.canSeeContent(viewerId, person)) {
            throw new ForbiddenException("Este perfil é privado");
        }
        return person;
    }
}
