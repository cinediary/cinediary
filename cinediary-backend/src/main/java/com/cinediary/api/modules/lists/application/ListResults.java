package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.lists.domain.UserList;
import com.cinediary.api.modules.users.api.UserView;
import java.util.List;

/** O que os casos de uso de listas devolvem. */
public final class ListResults
{
    private ListResults()
    {
    }

    /** A lista sem os itens: o dono, quantos títulos e os pôsteres da capa (os primeiros, na ordem). */
    public record Summary(UserList list, UserView owner, int itemsCount, List<String> coverPosters)
    {
    }

    public record Item(TitleSummaryView title, int position, String note)
    {
    }

    public record Detail(Summary summary, List<Item> items)
    {
    }
}
