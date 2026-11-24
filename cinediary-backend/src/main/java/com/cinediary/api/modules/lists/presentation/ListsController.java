package com.cinediary.api.modules.lists.presentation;

import com.cinediary.api.modules.lists.application.ListItemsUseCase;
import com.cinediary.api.modules.lists.application.ManageListsUseCase;
import com.cinediary.api.modules.lists.presentation.dto.ListItemRequest;
import com.cinediary.api.modules.lists.presentation.dto.ListOrderRequest;
import com.cinediary.api.modules.lists.presentation.dto.MyListResponse;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.modules.lists.presentation.dto.ListDetailResponse;
import com.cinediary.api.modules.lists.presentation.dto.ListRequest;
import com.cinediary.api.modules.lists.presentation.dto.ListSummaryResponse;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Lists")
public class ListsController
{
    private final ManageListsUseCase lists;
    private final ListItemsUseCase items;

    @GetMapping("/users/{username}/lists")
    @Operation(summary = "Listas de um perfil (as privadas só para o dono; perfil privado que você não segue: 403)")
    public List<ListSummaryResponse> ofUser(CurrentUser user, @PathVariable String username)
    {
        return lists.ofUser(user.id(), username).stream().map(ListSummaryResponse::from).toList();
    }

    @PostMapping("/lists")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria uma lista (nome obrigatório; ranking e visibilidade opcionais)")
    public ListDetailResponse create(CurrentUser user, @Valid @RequestBody ListRequest request)
    {
        return ListDetailResponse.from(lists.create(user.id(), request.name(), request.description(),
                Boolean.TRUE.equals(request.ranked()), request.visibilityOrNull()));
    }

    @GetMapping("/lists/{listId}")
    @Operation(summary = "Uma lista com os títulos, na ordem (privada ou de perfil privado que você não segue: 403)")
    public ListDetailResponse get(CurrentUser user, @PathVariable UUID listId)
    {
        return ListDetailResponse.from(lists.get(user.id(), listId));
    }

    @PatchMapping("/lists/{listId}")
    @Operation(summary = "Edita uma lista (só o dono; os campos que não vierem ficam como estão)")
    public ListDetailResponse update(CurrentUser user, @PathVariable UUID listId, @Valid @RequestBody ListRequest request)
    {
        return ListDetailResponse.from(lists.update(user.id(), listId, request.name(), request.description(), request.ranked(),
                request.visibilityOrNull()));
    }

    @DeleteMapping("/lists/{listId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Exclui uma lista (só o dono)")
    public void delete(CurrentUser user, @PathVariable UUID listId)
    {
        lists.delete(user.id(), listId);
    }

    @PostMapping("/lists/{listId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Adiciona um título no fim da lista (só o dono; título repetido: 409)")
    public ListDetailResponse addItem(CurrentUser user, @PathVariable UUID listId, @RequestBody ListItemRequest request)
    {
        if (request.titleId() == null) {
            throw new DomainValidationException("Informe o título");
        }
        return ListDetailResponse.from(items.add(user.id(), listId, request.titleId(), request.note()));
    }

    @PatchMapping("/lists/{listId}/items/{titleId}")
    @Operation(summary = "Muda a nota de um título na lista (só o dono; vazia apaga)")
    public ListDetailResponse updateItem(CurrentUser user, @PathVariable UUID listId, @PathVariable long titleId,
                                         @RequestBody ListItemRequest request)
    {
        return ListDetailResponse.from(items.note(user.id(), listId, titleId, request.note()));
    }

    @DeleteMapping("/lists/{listId}/items/{titleId}")
    @Operation(summary = "Tira um título da lista (só o dono); as posições seguintes sobem")
    public ListDetailResponse removeItem(CurrentUser user, @PathVariable UUID listId, @PathVariable long titleId)
    {
        return ListDetailResponse.from(items.remove(user.id(), listId, titleId));
    }

    @PutMapping("/lists/{listId}/items/order")
    @Operation(summary = "Reordena a lista (só o dono; todos os títulos, cada um uma vez)")
    public ListDetailResponse reorder(CurrentUser user, @PathVariable UUID listId, @RequestBody ListOrderRequest request)
    {
        return ListDetailResponse.from(items.reorder(user.id(), listId, request.titleIds()));
    }

    @GetMapping("/titles/{titleId}/my-lists")
    @Operation(summary = "As suas listas, cada uma dizendo se tem o título")
    public List<MyListResponse> myLists(CurrentUser user, @PathVariable long titleId)
    {
        return items.myLists(user.id(), titleId).stream().map(MyListResponse::from).toList();
    }
}
