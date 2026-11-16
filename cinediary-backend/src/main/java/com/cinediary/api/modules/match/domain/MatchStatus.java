package com.cinediary.api.modules.match.domain;

public enum MatchStatus
{
    PENDING("Aguardando seu amigo"),
    BUILDING("Match em construção"),
    ACTIVE("Match ativo"),
    ARCHIVED("Match arquivado");

    private final String label;

    MatchStatus(String label)
    {
        this.label = label;
    }

    public String label()
    {
        return label;
    }
}
