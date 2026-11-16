package com.cinediary.api.modules.social.presentation;

import com.cinediary.api.modules.social.application.FollowUseCase;
import com.cinediary.api.modules.social.application.GetPersonDiaryUseCase;
import com.cinediary.api.modules.social.application.GetPublicProfileUseCase;
import com.cinediary.api.modules.social.application.ListPeopleUseCase;
import com.cinediary.api.modules.social.presentation.dto.PersonEntryResponse;
import com.cinediary.api.modules.social.presentation.dto.SocialPersonResponse;
import com.cinediary.api.modules.social.presentation.dto.PublicProfileResponse;
import com.cinediary.api.modules.social.presentation.dto.RelationshipResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Social")
public class SocialController
{
    private final GetPublicProfileUseCase profile;
    private final GetPersonDiaryUseCase diary;
    private final FollowUseCase follow;
    private final ListPeopleUseCase people;

    @GetMapping("/users/{username}")
    @Operation(summary = "Perfil de alguém (privado e sem seguir: só nome, foto e contadores)")
    public PublicProfileResponse profile(CurrentUser user, @PathVariable String username)
    {
        return PublicProfileResponse.from(profile.execute(username, user.id()));
    }

    @GetMapping("/users/{username}/diary")
    @Operation(summary = "Diário de alguém, mais recentes primeiro (403 se privado e você não segue)")
    public List<PersonEntryResponse> diary(CurrentUser user, @PathVariable String username,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size)
    {
        return diary.entries(username, user.id(), page, size).stream().map(PersonEntryResponse::from).toList();
    }

    @GetMapping("/users/{username}/diary/{entryId}")
    @Operation(summary = "Uma entrada do diário de alguém")
    public PersonEntryResponse entry(CurrentUser user, @PathVariable String username, @PathVariable UUID entryId)
    {
        return PersonEntryResponse.from(diary.entry(username, entryId, user.id()));
    }

    @PostMapping("/users/{username}/follow")
    @Operation(summary = "Seguir (perfil privado: vira pedido, REQUESTED)")
    public RelationshipResponse follow(CurrentUser user, @PathVariable String username)
    {
        return new RelationshipResponse(follow.follow(user.id(), username).name());
    }

    @DeleteMapping("/users/{username}/follow")
    @Operation(summary = "Deixar de seguir ou cancelar o pedido")
    public RelationshipResponse unfollow(CurrentUser user, @PathVariable String username)
    {
        return new RelationshipResponse(follow.unfollow(user.id(), username).name());
    }

    @GetMapping("/users/{username}/followers")
    @Operation(summary = "Seguidores de alguém")
    public List<SocialPersonResponse> followers(CurrentUser user, @PathVariable String username,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "30") int size)
    {
        return people.followers(username, user.id(), page, size).stream().map(SocialPersonResponse::from).toList();
    }

    @GetMapping("/users/{username}/following")
    @Operation(summary = "Quem alguém segue")
    public List<SocialPersonResponse> following(CurrentUser user, @PathVariable String username,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "30") int size)
    {
        return people.following(username, user.id(), page, size).stream().map(SocialPersonResponse::from).toList();
    }

    @GetMapping("/people/search")
    @Operation(summary = "Busca de pessoas por @ ou nome (mínimo 2 letras)")
    public List<SocialPersonResponse> search(CurrentUser user, @RequestParam("q") String q)
    {
        return people.search(q, user.id()).stream().map(SocialPersonResponse::from).toList();
    }

    @GetMapping("/me/follow-requests")
    @Operation(summary = "Pedidos para te seguir esperando aprovação (perfil privado)")
    public List<SocialPersonResponse> requests(CurrentUser user)
    {
        return people.pendingRequests(user.id()).stream().map(SocialPersonResponse::from).toList();
    }

    @PostMapping("/me/follow-requests/{userId}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Aprovar um pedido para te seguir")
    public void approve(CurrentUser user, @PathVariable UUID userId)
    {
        follow.approve(user.id(), userId);
    }

    @DeleteMapping("/me/follow-requests/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Recusar um pedido para te seguir")
    public void decline(CurrentUser user, @PathVariable UUID userId)
    {
        follow.removeFollower(user.id(), userId);
    }

    @DeleteMapping("/me/followers/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Tirar alguém dos seus seguidores")
    public void removeFollower(CurrentUser user, @PathVariable UUID userId)
    {
        follow.removeFollower(user.id(), userId);
    }
}
