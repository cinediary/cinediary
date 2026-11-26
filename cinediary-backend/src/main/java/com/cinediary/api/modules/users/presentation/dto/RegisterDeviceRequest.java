package com.cinediary.api.modules.users.presentation.dto;

import com.cinediary.api.modules.users.domain.PushPlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** O aparelho para as notificações push: o token do Expo e o sistema. */
public record RegisterDeviceRequest(@NotBlank @Size(max = 255) String token, @NotNull PushPlatform platform)
{
}
