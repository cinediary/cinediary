package com.cinediary.api.modules.users.presentation;

import com.cinediary.api.modules.users.application.CheckUsernameAvailabilityUseCase;
import com.cinediary.api.modules.users.presentation.dto.UsernameAvailabilityResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rotas sem login do módulo users (liberadas em /api/v1/public/** no SecurityConfig). */
@RestController
@RequestMapping("/api/v1/public/usernames")
@RequiredArgsConstructor
@Tag(name = "Público")
public class PublicUsersController
{
    private final CheckUsernameAvailabilityUseCase availability;

    @GetMapping("/{username}/availability")
    @Operation(summary = "Se um @username está livre (cadastro, antes de criar a conta)")
    public ResponseEntity<UsernameAvailabilityResponse> availability(@PathVariable String username)
    {
        var reason = availability.execute(username);
        var body = new UsernameAvailabilityResponse(username.strip().toLowerCase(Locale.ROOT),
                reason == CheckUsernameAvailabilityUseCase.Reason.AVAILABLE, reason.name());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
