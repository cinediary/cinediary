package com.cinediary.api.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.cinediary.api.CineDiaryApplication;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.springframework.modulith.core.ApplicationModules;

/**
 * Regras inegociáveis do Blueprint v2.1, verificadas a cada build: fronteiras entre módulos pelo Spring Modulith
 * ({@code @NamedInterface("api")}, sem ciclos) e as 5 camadas da Clean Architecture pelo ArchUnit.
 */
class ArchitectureFitnessTest
{
    private static final String ROOT = "com.cinediary.api";
    private static final List<String> MODULES = List.of("users", "catalog", "diary", "importing", "stats", "match", "social", "lists");
    private static final List<String> LAYERS = List.of("api", "domain", "application", "infrastructure", "presentation");

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses()
    {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(ROOT);
    }

    /** Spring Modulith: só a named interface "api" é acessível e não há ciclos entre módulos. */
    @Test
    void modulithModuleBoundariesAreRespected()
    {
        ApplicationModules modules = ApplicationModules.of(CineDiaryApplication.class);
        modules.verify();
        assertModulesDetected(modules);
    }

    private static void assertModulesDetected(ApplicationModules modules)
    {
        List<String> names = modules.stream().map(m -> m.getIdentifier().toString()).sorted().toList();
        List<String> expected = new java.util.ArrayList<>(MODULES.stream().map(m -> "modules." + m).toList());
        expected.add("shared");
        if (!names.containsAll(expected)) {
            throw new AssertionError("Módulos detectados pelo Spring Modulith: " + names);
        }
    }

    @Test
    void domainIsPureJava()
    {
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "jakarta.persistence..", "org.springframework..", "org.hibernate..", "tools.jackson..",
                        "com.fasterxml.jackson..", "org.neo4j..", "com.svix..", "lombok..")
                .because("domain é Java puro (sem JPA, Spring, Jackson, Neo4j ou Svix)")
                .check(classes);
    }

    @Test
    void domainDoesNotDependOnOuterLayers()
    {
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("..application..", "..infrastructure..",
                        "..presentation..", ROOT + ".modules.*.api..")
                .check(classes);
    }

    @Test
    void applicationDoesNotDependOnInfrastructureOrPresentation()
    {
        noClasses().that().resideInAPackage("..application..")
                .should().dependOnClassesThat().resideInAnyPackage("..infrastructure..", "..presentation..")
                .because("casos de uso falam com o mundo só por Ports")
                .check(classes);
    }

    @Test
    void presentationDoesNotTouchInfrastructure()
    {
        noClasses().that().resideInAPackage("..presentation..")
                .should().dependOnClassesThat().resideInAPackage("..infrastructure..")
                .check(classes);
    }

    @Test
    void controllersOnlyLiveInPresentation()
    {
        classes().that().areAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                .should().resideInAPackage("..presentation..")
                .check(classes);
    }

    @Test
    void jpaEntitiesOnlyLiveInInfrastructure()
    {
        classes().that().areAnnotatedWith(jakarta.persistence.Entity.class)
                .should().resideInAPackage("..infrastructure..")
                .andShould().haveSimpleNameEndingWith("JpaEntity")
                .check(classes);
    }

    @Test
    void sharedKernelDoesNotDependOnModules()
    {
        noClasses().that().resideInAPackage(ROOT + ".shared..")
                .should().dependOnClassesThat().resideInAPackage(ROOT + ".modules..")
                .check(classes);
    }

    @Test
    void everyModuleHasTheFiveLayers()
    {
        for (String module : MODULES) {
            for (String layer : LAYERS) {
                String pkg = ROOT + ".modules." + module + "." + layer;
                if (classes.stream().noneMatch(c -> c.getPackageName().startsWith(pkg))) {
                    throw new AssertionError("Módulo " + module + " sem a camada " + layer);
                }
            }
        }
    }

    /** Um módulo só enxerga o pacote {@code api} dos outros: nunca domain, application, infrastructure ou presentation. */
    @TestFactory
    List<DynamicTest> modulesTalkOnlyThroughApi()
    {
        return MODULES.stream().map(module -> DynamicTest.dynamicTest("só a api de " + module + " é pública", () ->
                noClasses().that().resideInAPackage(ROOT + ".modules..")
                        .and().resideOutsideOfPackage(ROOT + ".modules." + module + "..")
                        .should().dependOnClassesThat().resideInAnyPackage(
                                ROOT + ".modules." + module + ".domain..",
                                ROOT + ".modules." + module + ".application..",
                                ROOT + ".modules." + module + ".infrastructure..",
                                ROOT + ".modules." + module + ".presentation..")
                        .check(classes)))
                .toList();
    }
}
