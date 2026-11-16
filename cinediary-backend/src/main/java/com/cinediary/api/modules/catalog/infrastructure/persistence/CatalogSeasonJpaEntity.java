package com.cinediary.api.modules.catalog.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "catalog_seasons")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class CatalogSeasonJpaEntity
{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title_id", nullable = false)
    private Long titleId;

    @Column(name = "season_number", nullable = false)
    private Short seasonNumber;

    @Column(nullable = false)
    private String name;

    @Column(name = "episode_count", nullable = false)
    private Short episodeCount;
}
