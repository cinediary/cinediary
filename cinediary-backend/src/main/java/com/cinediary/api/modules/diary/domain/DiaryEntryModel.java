package com.cinediary.api.modules.diary.domain;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import com.cinediary.api.shared.domain.ReplyPolicy;
import java.util.UUID;

/**
 * Uma vez que a pessoa viu o título (permite rewatch: várias entradas com datas diferentes).
 * Em séries, {@code seasonNumber}/{@code episodeNumber} dizem se a entrada é de uma temporada ou de um
 * episódio; os dois nulos = o título inteiro. {@code containsSpoilers}: a review conta o que acontece
 * (o app a esconde até a pessoa escolher ver). {@code replyPolicy}: quem pode responder (null = o padrão da
 * conta do dono).
 */
public record DiaryEntryModel(UUID id, UUID userId, long titleId, LocalDate watchedDate, BigDecimal rating,
                              boolean liked, boolean rewatch, String reviewText, String importHash, Instant createdAt,
                              Integer seasonNumber, Integer episodeNumber, boolean containsSpoilers,
                              ReplyPolicy replyPolicy)
{
    /** Entrada do título inteiro (filme, série toda ou importação). */
    public DiaryEntryModel(UUID id, UUID userId, long titleId, LocalDate watchedDate, BigDecimal rating, boolean liked,
                           boolean rewatch, String reviewText, String importHash, Instant createdAt)
    {
        this(id, userId, titleId, watchedDate, rating, liked, rewatch, reviewText, importHash, createdAt, null, null, false,
                null);
    }

    /** A mesma entrada com os campos editáveis trocados (título, parte da série e importação não mudam). */
    public DiaryEntryModel edited(LocalDate date, BigDecimal newRating, boolean newLiked, boolean newRewatch,
                                  String review, boolean spoilers, ReplyPolicy replies)
    {
        return new DiaryEntryModel(id, userId, titleId, date, newRating, newLiked, newRewatch, review, importHash,
                createdAt, seasonNumber, episodeNumber, review != null && spoilers, replies);
    }

    public boolean isScoped()
    {
        return seasonNumber != null;
    }

    /** ADR-05: SHA-256(user_id:title_id:watched_date:PROVIDER) garante idempotência da importação. */
    public static String importHash(UUID userId, long titleId, LocalDate watchedDate, String provider)
    {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    (userId + ":" + titleId + ":" + watchedDate + ":" + provider).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
