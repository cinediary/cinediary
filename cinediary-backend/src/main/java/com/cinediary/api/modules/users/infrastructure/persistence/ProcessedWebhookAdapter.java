package com.cinediary.api.modules.users.infrastructure.persistence;

import com.cinediary.api.modules.users.domain.ProcessedWebhookPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class ProcessedWebhookAdapter implements ProcessedWebhookPort
{
    private final SpringDataProcessedWebhookRepository repository;

    @Override
    public boolean registerIfNew(String svixId, String eventType)
    {
        return repository.insertIfAbsent(svixId, eventType) == 1;
    }
}
