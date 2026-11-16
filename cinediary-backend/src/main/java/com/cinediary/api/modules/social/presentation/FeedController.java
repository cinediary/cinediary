package com.cinediary.api.modules.social.presentation;

import com.cinediary.api.modules.social.application.GetFeedUseCase;
import com.cinediary.api.modules.social.application.GetFriendsActivityUseCase;
import com.cinediary.api.modules.social.application.NotificationsUseCase;
import com.cinediary.api.modules.social.presentation.dto.ActivityResponse;
import com.cinediary.api.modules.social.presentation.dto.FeedResponse;
import com.cinediary.api.modules.social.presentation.dto.NotificationResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Feed de quem você segue e o sino. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Social")
public class FeedController
{
    private final GetFeedUseCase feed;
    private final NotificationsUseCase notifications;
    private final GetFriendsActivityUseCase activity;

    @GetMapping("/feed")
    @Operation(summary = "Registros recentes de quem você segue (sem importações); before = cursor")
    public FeedResponse feed(CurrentUser user, @RequestParam(required = false) Instant before,
                             @RequestParam(defaultValue = "20") int limit)
    {
        int safe = Math.clamp(limit, 1, 50);
        return FeedResponse.from(feed.execute(user.id(), before, safe), safe);
    }

    @GetMapping("/activity")
    @Operation(summary = "Aba \"Amigos\" do sino: o que você e quem você segue fizeram (registros, seguiu, curtiu, respondeu)")
    public ActivityResponse activity(CurrentUser user, @RequestParam(required = false) Instant before,
                                     @RequestParam(defaultValue = "25") int limit)
    {
        int safe = Math.clamp(limit, 1, 50);
        return ActivityResponse.from(activity.execute(user.id(), before, safe), safe);
    }

    @GetMapping("/me/notifications")
    @Operation(summary = "Sino: avisos mais recentes (curtidas no mesmo registro agrupadas)")
    public List<NotificationResponse> notifications(CurrentUser user)
    {
        return notifications.list(user.id()).stream().map(NotificationResponse::from).toList();
    }

    @GetMapping("/me/notifications/unread-count")
    @Operation(summary = "Quantos avisos não vistos (o número do sino)")
    public Map<String, Long> unread(CurrentUser user)
    {
        return Map.of("count", notifications.unseenCount(user.id()));
    }

    @PostMapping("/me/notifications/seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Marca todos os avisos como vistos (ao abrir o sino)")
    public void seen(CurrentUser user)
    {
        notifications.markAllSeen(user.id());
    }
}
