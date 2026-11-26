package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.shared.domain.ContentLanguage;

/**
 * O texto do push no idioma do aparelho, igual ao do sino no app ({@code shared/i18n/<idioma>/social.ts}, "notif"),
 * com o nome de quem fez antes. {@code title}: o título do registro; {@code list}: o nome da lista.
 */
final class PushTexts
{
    private PushTexts()
    {
    }

    static String of(ContentLanguage language, NotificationKind kind, String actor, String title, String list)
    {
        String phrase = switch (language) {
            case EN -> switch (kind) {
                case FOLLOWED -> "started following you";
                case FOLLOW_REQUESTED -> "requested to follow you";
                case FOLLOW_APPROVED -> "accepted your follow request";
                case ENTRY_LIKED -> "liked your entry for " + title;
                case ENTRY_REPLIED -> "replied to your entry for " + title;
                case ENTRY_COMPANION -> "tagged you in their entry for " + title;
                case LIST_LIKED -> "liked your list " + list;
            };
            case ES, ES_419 -> switch (kind) {
                case FOLLOWED -> "empezó a seguirte";
                case FOLLOW_REQUESTED -> "pidió seguirte";
                case FOLLOW_APPROVED -> "aceptó tu solicitud para seguir";
                case ENTRY_LIKED -> "dio me gusta a tu registro de " + title;
                case ENTRY_REPLIED -> "respondió a tu registro de " + title;
                case ENTRY_COMPANION -> "te etiquetó en su registro de " + title;
                case LIST_LIKED -> "le gustó tu lista " + list;
            };
            case FR -> switch (kind) {
                case FOLLOWED -> "a commencé à te suivre";
                case FOLLOW_REQUESTED -> "a demandé à te suivre";
                case FOLLOW_APPROVED -> "a accepté ta demande d’abonnement";
                case ENTRY_LIKED -> "a aimé ton entrée de " + title;
                case ENTRY_REPLIED -> "a répondu à ton entrée de " + title;
                case ENTRY_COMPANION -> "indique que vous avez vu " + title + " ensemble";
                case LIST_LIKED -> "a aimé ta liste " + list;
            };
            case PT -> switch (kind) {
                case FOLLOWED -> "começou a te seguir";
                case FOLLOW_REQUESTED -> "pediu para te seguir";
                case FOLLOW_APPROVED -> "aceitou seu pedido para seguir";
                case ENTRY_LIKED -> "curtiu seu registro de " + title;
                case ENTRY_REPLIED -> "respondeu seu registro de " + title;
                case ENTRY_COMPANION -> "marcou você no registro de " + title;
                case LIST_LIKED -> "curtiu sua lista " + list;
            };
        };
        return actor + " " + phrase;
    }
}
