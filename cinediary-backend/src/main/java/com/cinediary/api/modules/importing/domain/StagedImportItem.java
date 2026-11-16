package com.cinediary.api.modules.importing.domain;

/** Item reconciliado com o catálogo, aguardando a confirmação da pessoa. */
public record StagedImportItem(long titleId, LetterboxdParsedItem item)
{
}
