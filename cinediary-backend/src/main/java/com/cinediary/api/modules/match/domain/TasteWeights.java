package com.cinediary.api.modules.match.domain;

/**
 * Regras do Taste Match (ADR-06), usadas igualmente pelo motor Neo4j + GDS e pelo fallback:
 * pesos 50/30/20 (Modo Descoberta 65/35 com menos de 3 títulos avaliados em comum) e peso de afinidade
 * de cada interação.
 */
public final class TasteWeights
{
    public static final double RATINGS = 0.50;
    public static final double GENRES = 0.30;
    public static final double FAVORITES = 0.20;
    public static final double DISCOVERY_GENRES = 0.65;
    public static final double DISCOVERY_FAVORITES = 0.35;
    public static final int DISCOVERY_THRESHOLD = 3;

    /** Interação forte o bastante para contar os gêneros do título como gosto da pessoa. */
    public static final double GENRE_AFFINITY = 0.7;
    /** "Ama": nota alta, curtido, favorito ou marcado no onboarding. */
    public static final double LOVED = 0.8;
    /** Diferença de notas a partir da qual a dupla "discorda". */
    public static final double DISAGREEMENT_GAP = 2.0;

    private TasteWeights()
    {
    }

    /**
     * Nota presente: nota/5 (+0.15 se curtiu ou favoritou, até 1.0). Sem nota: curtido, favorito ou sinal do
     * onboarding = 0.80; só assistido = 0.60.
     */
    public static double affinityWeight(Double rating, boolean liked, boolean favorite, boolean watched,
                                        boolean signalOnly)
    {
        if (rating != null) {
            return Math.min(1.0, rating / 5.0 + (liked || favorite ? 0.15 : 0.0));
        }
        if (liked || favorite || signalOnly) {
            return 0.80;
        }
        return watched ? 0.60 : 0.0;
    }

    public static double round1(double value)
    {
        return Math.round(value * 10.0) / 10.0;
    }
}
