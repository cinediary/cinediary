package com.cinediary.api.modules.users.presentation;

import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.application.CompleteOnboardingUseCase;
import com.cinediary.api.modules.users.application.DeleteAccountUseCase;
import com.cinediary.api.modules.users.application.GetCurrentUserUseCase;
import com.cinediary.api.modules.users.application.OnboardingResult;
import com.cinediary.api.modules.users.application.UpdateProfileHeaderUseCase;
import com.cinediary.api.modules.users.application.UpdateUserProfileUseCase;
import com.cinediary.api.modules.users.presentation.dto.OnboardingRequest;
import com.cinediary.api.modules.users.presentation.dto.OnboardingResponse;
import com.cinediary.api.modules.users.presentation.dto.UpdateHeaderRequest;
import com.cinediary.api.modules.users.presentation.dto.UpdateProfileRequest;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "Users & Onboarding")
public class MeController
{
    private final GetCurrentUserUseCase getCurrentUser;
    private final UpdateUserProfileUseCase updateUserProfile;
    private final CompleteOnboardingUseCase completeOnboarding;
    private final DeleteAccountUseCase deleteAccount;
    private final UpdateProfileHeaderUseCase updateHeader;

    @GetMapping
    @Operation(summary = "Perfil do usuário autenticado")
    public UserProfileView me(CurrentUser user)
    {
        return getCurrentUser.execute(user.id());
    }

    @PatchMapping
    @Operation(summary = "Atualiza @username, nome, foto, privacidade e favoritos")
    public UserProfileView update(CurrentUser user, @Valid @RequestBody UpdateProfileRequest request)
    {
        return updateUserProfile.execute(user.id(), request.toCommand());
    }

    @PutMapping("/header")
    @Operation(summary = "Define a capa do perfil: um backdrop do TMDB de um título")
    public UserProfileView setHeader(CurrentUser user, @Valid @RequestBody UpdateHeaderRequest request)
    {
        return updateHeader.set(user.id(), request.titleId(), request.backdropPath());
    }

    @DeleteMapping("/header")
    @Operation(summary = "Remove a capa do perfil")
    public UserProfileView removeHeader(CurrentUser user)
    {
        return updateHeader.remove(user.id());
    }

    @PostMapping("/onboarding")
    @Operation(summary = "Conclui o onboarding (0 ou mais gêneros/títulos; aceita convite pendente)")
    public OnboardingResponse onboarding(CurrentUser user, @Valid @RequestBody OnboardingRequest request)
    {
        OnboardingResult result = completeOnboarding.execute(user.id(), request.toCommand());
        return new OnboardingResponse(result.onboardingCompleted(), result.activatedMatchId());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Exclui a conta: soft delete local e remoção do usuário no Clerk")
    public void delete(CurrentUser user)
    {
        deleteAccount.execute(user.id(), user.clerkId());
    }
}
