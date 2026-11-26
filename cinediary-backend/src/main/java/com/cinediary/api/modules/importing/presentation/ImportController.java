package com.cinediary.api.modules.importing.presentation;

import com.cinediary.api.modules.importing.application.ConfirmImportJobUseCase;
import com.cinediary.api.modules.importing.application.GetImportJobUseCase;
import com.cinediary.api.modules.importing.application.StartLetterboxdImportUseCase;
import com.cinediary.api.modules.importing.presentation.dto.ConfirmImportRequest;
import com.cinediary.api.modules.importing.presentation.dto.ImportJobResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import com.cinediary.api.shared.domain.DomainValidationException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/imports")
@RequiredArgsConstructor
@Tag(name = "Importing (Letterboxd)")
public class ImportController
{
    private final StartLetterboxdImportUseCase startImport;
    private final GetImportJobUseCase getImportJob;
    private final ConfirmImportJobUseCase confirmImportJob;

    @PostMapping(path = "/letterboxd", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Envia o ZIP do Letterboxd (até 20 MB) e inicia a reconciliação assíncrona")
    public ImportJobResponse upload(CurrentUser user, @RequestParam("file") MultipartFile file) throws IOException
    {
        if (file.isEmpty()) {
            throw new DomainValidationException("Envie o arquivo .zip exportado do Letterboxd");
        }
        return ImportJobResponse.from(startImport.execute(user.id(), file.getBytes()));
    }

    @GetMapping("/{jobId}")
    @Operation(summary = "Status e resumo antes de confirmar")
    public ImportJobResponse get(CurrentUser user, @PathVariable UUID jobId)
    {
        return ImportJobResponse.from(getImportJob.review(user.id(), jobId));
    }

    @PostMapping("/{jobId}/confirm")
    @Operation(summary = "Confirma a importação: responde em APPLYING e grava no diário em segundo plano, sem duplicar nada (favoritesMode: KEEP, REPLACE ou MERGE)")
    public ImportJobResponse confirm(CurrentUser user, @PathVariable UUID jobId,
                                     @RequestBody(required = false) ConfirmImportRequest request)
    {
        var mode = request == null ? new ConfirmImportRequest(null).modeOrDefault() : request.modeOrDefault();
        return ImportJobResponse.from(confirmImportJob.execute(user.id(), jobId, mode));
    }
}
