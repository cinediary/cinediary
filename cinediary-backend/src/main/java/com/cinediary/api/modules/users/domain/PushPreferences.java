package com.cinediary.api.modules.users.domain;

/** Quais pushes a pessoa quer receber (#15). */
public record PushPreferences(boolean followers, boolean likes, boolean replies, boolean companions)
{
    public static final PushPreferences ALL_ON = new PushPreferences(true, true, true, true);
}
