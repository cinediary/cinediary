package com.cinediary.api.shared.infrastructure.config;

import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig
{
    static {
        // CurrentUser vem do token, não da requisição: some do Swagger.
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(CurrentUser.class);
    }

    @Bean
    OpenAPI cineDiaryOpenApi()
    {
        return new OpenAPI()
                .info(new Info().title("CineDiary API").version("2.0.0")
                        .description("Monólito modular em Clean Architecture: users, catalog, diary, importing, stats, match "
                                + "(Taste Match em Neo4j + GDS com fallback SQL)"))
                .components(new Components().addSecuritySchemes("BearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }
}
