package com.cinediary.api.modules.social.presentation;

import com.cinediary.api.modules.social.application.EntryCompanionsUseCase;
import com.cinediary.api.modules.social.presentation.dto.EntryCompanionsResponse;
import com.cinediary.api.modules.social.presentation.dto.FeedResponse;
import com.cinediary.api.modules.social.presentation.dto.LinkOwnEntryRequest;
import com.cinediary.api.modules.social.presentation.dto.PersonEntryResponse;
import com.cinediary.api.modules.social.presentation.dto.SetCompanionsRequest;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** "Vi com…": marcar amigos num registro, aceitar ou recusar, e os registros em que alguém foi marcado. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Social")
public class EntryCompanionsController
{
    private static final int MAX_PAGE_SIZE = 50;

    private final EntryCompanionsUseCase companions;

    @GetMapping("/entries/{entryId}/companions")
    @Operation(summary = "Quem viu junto (o dono vê também quem ainda não aceitou)")
    public EntryCompanionsResponse of(CurrentUser user, @PathVariable UUID entryId)
    {
        return EntryCompanionsResponse.from(companions.of(entryId, user.id()));
    }

    @PutMapping("/entries/{entryId}/companions")
    @Operation(summary = "Define quem viu junto (só amigos: segue e é seguido). Quem entra é avisado")
    public EntryCompanionsResponse set(CurrentUser user, @PathVariable UUID entryId, @RequestBody SetCompanionsRequest request)
    {
        return EntryCompanionsResponse.from(companions.set(entryId, user.id(), request.usernames()));
    }

    @PostMapping("/me/companions/{entryId}/accept")
    @Operation(summary = "Aceitar a marcação: aparece no registro")
    public EntryCompanionsResponse accept(CurrentUser user, @PathVariable UUID entryId)
    {
        return EntryCompanionsResponse.from(companions.accept(entryId, user.id()));
    }

    @PostMapping("/me/companions/{entryId}/logged")
    @Operation(summary = "Você registrou o mesmo título: seu registro ganha \"vi com\" quem te marcou (já aceito)")
    public EntryCompanionsResponse logged(CurrentUser user, @PathVariable UUID entryId, @Valid @RequestBody LinkOwnEntryRequest request)
    {
        return EntryCompanionsResponse.from(companions.linkOwnEntry(entryId, user.id(), request.entryId()));
    }

    @PostMapping("/me/companions/{entryId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Recusar a marcação (quem marcou não é avisado)")
    public void decline(CurrentUser user, @PathVariable UUID entryId)
    {
        companions.decline(entryId, user.id());
    }

    @DeleteMapping("/me/companions/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Tirar uma marcação já aceita")
    public void remove(CurrentUser user, @PathVariable UUID entryId)
    {
        companions.remove(entryId, user.id());
    }

    @GetMapping("/me/friends")
    @Operation(summary = "Seus amigos (segue e é seguido), para o \"Vi com…\"; q filtra pelo começo do @ ou do nome")
    public List<FeedResponse.Author> friends(CurrentUser user, @RequestParam(defaultValue = "") String q)
    {
        return companions.friends(user.id(), q).stream()
                .map(u -> new FeedResponse.Author(u.id(), u.username(), u.displayName(), u.avatarUrl()))
                .toList();
    }

    @GetMapping("/users/{username}/watched-with")
    @Operation(summary = "Registros em que a pessoa foi marcada e aceitou (403 se privado e você não segue)")
    public List<PersonEntryResponse> watchedWith(CurrentUser user, @PathVariable String username,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size)
    {
        return companions.watchedWith(username, user.id(), Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)).stream()
                .map(PersonEntryResponse::from).toList();
    }
}
