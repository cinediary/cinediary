package com.cinediary.api.modules.users.api;

/** Quais pushes a pessoa quer receber (#15). Tudo ligado até ela mudar. */
public record PushPreferencesView(boolean followers, boolean likes, boolean replies, boolean companions)
{
    public boolean allows(PushCategory category)
    {
        return switch (category) {
            case FOLLOWERS -> followers;
            case LIKES -> likes;
            case REPLIES -> replies;
            case COMPANIONS -> companions;
        };
    }
}
