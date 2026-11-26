package com.cinediary.api.modules.users.presentation;

import com.cinediary.api.modules.users.api.PushPreferencesView;
import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.application.CompleteOnboardingUseCase;
import com.cinediary.api.modules.users.application.GetCurrentUserUseCase;
import com.cinediary.api.modules.users.application.OnboardingResult;
import com.cinediary.api.modules.users.application.PushDevicesUseCase;
import com.cinediary.api.modules.users.application.PushPreferencesUseCase;
import com.cinediary.api.modules.users.application.UpdateProfileHeaderUseCase;
import com.cinediary.api.modules.users.application.UpdateUserProfileUseCase;
import com.cinediary.api.modules.users.presentation.dto.OnboardingRequest;
import com.cinediary.api.modules.users.presentation.dto.OnboardingResponse;
import com.cinediary.api.modules.users.presentation.dto.RegisterDeviceRequest;
import com.cinediary.api.modules.users.presentation.dto.UpdateHeaderRequest;
import com.cinediary.api.modules.users.presentation.dto.UpdateProfileRequest;
import com.cinediary.api.modules.users.presentation.dto.UpdatePushPreferencesRequest;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final UpdateProfileHeaderUseCase updateHeader;
    private final PushDevicesUseCase pushDevices;
    private final PushPreferencesUseCase pushPreferences;

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

    @PutMapping("/devices")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Registra o aparelho para as notificações push (o mesmo token só atualiza)")
    public void registerDevice(CurrentUser user, @Valid @RequestBody RegisterDeviceRequest request)
    {
        pushDevices.register(user.id(), request.token(), request.platform());
    }

    @DeleteMapping("/devices/{token}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Tira o aparelho das notificações push (no logout)")
    public void unregisterDevice(CurrentUser user, @PathVariable String token)
    {
        pushDevices.unregister(user.id(), token);
    }

    @GetMapping("/push-preferences")
    @Operation(summary = "Quais notificações push a pessoa quer receber (tudo ligado até mudar)")
    public PushPreferencesView pushPreferences(CurrentUser user)
    {
        return pushPreferences.get(user.id());
    }

    @PatchMapping("/push-preferences")
    @Operation(summary = "Liga ou desliga tipos de push; o que não vier fica como está (o sino continua mostrando tudo)")
    public PushPreferencesView updatePushPreferences(CurrentUser user, @RequestBody UpdatePushPreferencesRequest request)
    {
        return pushPreferences.update(user.id(), request.followers(), request.likes(), request.replies(), request.companions());
    }

    @PostMapping("/onboarding")
    @Operation(summary = "Conclui o onboarding (0 ou mais gêneros/títulos; aceita convite pendente)")
    public OnboardingResponse onboarding(CurrentUser user, @Valid @RequestBody OnboardingRequest request)
    {
        OnboardingResult result = completeOnboarding.execute(user.id(), request.toCommand());
        return new OnboardingResponse(result.onboardingCompleted(), result.activatedMatchId());
    }
}
