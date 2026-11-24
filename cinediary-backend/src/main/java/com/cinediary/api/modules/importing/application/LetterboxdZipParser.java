package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.importing.domain.ImportLimits;
import com.cinediary.api.modules.importing.domain.LetterboxdExport;
import com.cinediary.api.modules.importing.domain.LetterboxdList;
import com.cinediary.api.modules.importing.domain.InvalidImportFileException;
import com.cinediary.api.modules.importing.domain.LetterboxdParsedItem;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;
import org.springframework.stereotype.Component;

/**
 * Lê o ZIP exportado do Letterboxd em memória (nada é extraído para disco, então não há Zip Slip) com limites
 * de tamanho descompactado e de quantidade de arquivos (proteção contra Zip Bomb). Consolida os CSVs por filme.
 */
@Component
public class LetterboxdZipParser
{
    private static final List<String> KNOWN = List.of("watched.csv", "ratings.csv", "diary.csv", "reviews.csv",
            "watchlist.csv", "likes/films.csv", "profile.csv");
    /** O Letterboxd mostra até 4 favoritos no perfil. */
    private static final int MAX_FAVORITES = 4;
    private static final String URI = "Letterboxd URI";
    /**
     * Subpastas da própria exportação: deleted/ e orphaned/ (registros apagados ou sem filme), likes/
     * (o que você curtiu de OUTRAS pessoas: likes/reviews.csv são reviews alheias) e lists/ (lidas à parte, ver
     * isListFile). Nenhuma delas é a pasta da exportação; likes/films.csv é reconhecido pelo caminho completo.
     */
    private static final java.util.Set<String> IGNORED_FOLDERS = java.util.Set.of("deleted", "orphaned", "likes", "lists");

    public List<LetterboxdParsedItem> parse(byte[] zip, ImportLimits limits)
    {
        return parseExport(zip, limits).items();
    }

    /** Como parse, mas também devolve os favoritos do perfil que só existem como link. */
    public LetterboxdExport parseExport(byte[] zip, ImportLimits limits)
    {
        if (zip.length == 0) {
            throw new InvalidImportFileException("O arquivo está vazio");
        }
        if (zip.length > limits.maxZipBytes()) {
            throw new InvalidImportFileException("O ZIP pode ter no máximo " + limits.maxZipBytes() / (1024 * 1024) + " MB");
        }
        List<LetterboxdList> lists = new ArrayList<>();
        Map<String, List<Map<String, String>>> files = readCsvFiles(zip, limits, lists);
        if (files.isEmpty()) {
            throw new InvalidImportFileException(
                    "Não encontramos os arquivos do Letterboxd (watched.csv, ratings.csv, diary.csv...) no ZIP");
        }
        List<LetterboxdExport.UnresolvedFavorite> unresolved = new ArrayList<>();
        List<LetterboxdParsedItem> items = consolidate(files, unresolved);
        if (items.size() > limits.maxItems()) {
            throw new InvalidImportFileException("A exportação tem mais de " + limits.maxItems() + " filmes");
        }
        return new LetterboxdExport(items, unresolved, lists);
    }

    // --- ZIP ------------------------------------------------------------------------------------

    /** Os CSVs conhecidos, por nome; as listas ({@code lists/*.csv}) vão para {@code lists}. */
    private Map<String, List<Map<String, String>>> readCsvFiles(byte[] zip, ImportLimits limits, List<LetterboxdList> lists)
    {
        Map<String, List<Map<String, String>>> files = new HashMap<>();
        long totalUncompressed = 0;
        int entries = 0;
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = in.getNextEntry()) != null) {
                if (++entries > limits.maxEntries()) {
                    throw new InvalidImportFileException("O ZIP tem arquivos demais para uma exportação do Letterboxd");
                }
                if (entry.isDirectory()) {
                    continue;
                }
                String known = knownName(entry.getName());
                byte[] content = readLimited(in, limits.maxUncompressedBytes() - totalUncompressed);
                totalUncompressed += content.length;
                // O primeiro vale: nada que venha depois no ZIP substitui um CSV já lido.
                if (known != null) {
                    files.putIfAbsent(known, Csv.parse(new String(stripBom(content), StandardCharsets.UTF_8)));
                } else if (isListFile(entry.getName())) {
                    LetterboxdList list = parseList(new String(stripBom(content), StandardCharsets.UTF_8));
                    if (list != null) {
                        lists.add(list);
                    }
                }
            }
        } catch (ZipException e) {
            throw new InvalidImportFileException("O arquivo não é um ZIP válido");
        } catch (IOException e) {
            throw new InvalidImportFileException("Não foi possível ler o ZIP: " + e.getMessage());
        }
        return files;
    }

    /**
     * Qual CSV conhecido é esta entrada do ZIP. Aceita o arquivo na raiz (diary.csv) ou dentro de UMA pasta
     * de exportação (letterboxd-fulano-2026/diary.csv). A exportação também traz deleted/diary.csv e
     * orphaned/diary.csv (registros apagados ou sem filme) e likes/reviews.csv (reviews de outras pessoas):
     * antes eles casavam pelo final do caminho e, por virem depois no ZIP, sobrescreviam o diary.csv e o
     * reviews.csv de verdade, e a importação via 0 entradas de diário e 0 reviews.
     */
    static String knownName(String entryName)
    {
        String normalized = entryName.replace('\\', '/').toLowerCase(Locale.ROOT);
        for (String k : KNOWN) {
            if (normalized.equals(k)) {
                return k;
            }
            if (normalized.endsWith("/" + k)) {
                String folder = normalized.substring(0, normalized.length() - k.length() - 1);
                if (!folder.contains("/") && !IGNORED_FOLDERS.contains(folder)) {
                    return k;
                }
            }
        }
        return null;
    }

    /** {@code lists/x.csv} na raiz ou dentro de UMA pasta de exportação ({@code letterboxd-fulano/lists/x.csv}). */
    static boolean isListFile(String entryName)
    {
        String[] parts = entryName.replace('\\', '/').toLowerCase(Locale.ROOT).split("/");
        int n = parts.length;
        return n >= 2 && n <= 3 && parts[n - 2].equals("lists") && parts[n - 1].endsWith(".csv")
                && !parts[n - 1].startsWith("._");
    }

    /**
     * Um arquivo de lista ("Letterboxd list export v7") tem duas partes: os dados da lista
     * ({@code Date, Name, Tags, URL, Description}) e, depois de uma linha em branco, os títulos
     * ({@code Position, Name, Year, URL, Description}); a Description do título é a nota dele na lista.
     * Título repetido na lista entra uma vez (a primeira). Sem nome, a lista é ignorada.
     * Ranking: a exportação numera as posições em toda lista, com ou sem ranking no Letterboxd (conferido numa
     * exportação real), então não dá para saber. Toda lista entra sem ranking, na ordem de lá; a pessoa liga o
     * ranking ao editar, se for o caso (os números saem na mesma ordem).
     */
    static LetterboxdList parseList(String text)
    {
        List<List<String>> rows = Csv.rows(text);
        int meta = -1;
        int items = -1;
        for (int i = 0; i < rows.size(); i++) {
            String first = rows.get(i).getFirst().strip();
            if (meta < 0 && first.equals("Date")) {
                meta = i;
            } else if (first.equals("Position")) {
                items = i;
                break;
            }
        }
        if (meta < 0 || meta + 1 >= rows.size()) {
            return null;
        }
        Map<String, String> info = Csv.row(rows.get(meta), rows.get(meta + 1));
        String name = blankToNull(info.get("Name"));
        if (name == null) {
            return null;
        }
        List<LetterboxdList.Entry> entries = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        if (items >= 0) {
            for (List<String> r : rows.subList(items + 1, rows.size())) {
                if (r.size() == 1 && r.getFirst().isBlank()) {
                    continue;
                }
                Map<String, String> item = Csv.row(rows.get(items), r);
                String title = blankToNull(item.get("Name"));
                if (title == null) {
                    continue;
                }
                LetterboxdList.Entry e = new LetterboxdList.Entry(title, year(item.get("Year")), blankToNull(item.get("Description")));
                if (seen.add(e.key())) {
                    entries.add(e);
                }
            }
        }
        return new LetterboxdList(name, blankToNull(info.get("Description")), false, entries);
    }

    private static byte[] readLimited(InputStream in, long remaining) throws IOException
    {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        long read = 0;
        int n;
        while ((n = in.read(buffer)) > 0) {
            read += n;
            if (read > remaining) {
                throw new InvalidImportFileException("O conteúdo descompactado do ZIP é grande demais");
            }
            out.write(buffer, 0, n);
        }
        return out.toByteArray();
    }

    private static byte[] stripBom(byte[] b)
    {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xEF && (b[1] & 0xFF) == 0xBB && (b[2] & 0xFF) == 0xBF) {
            return java.util.Arrays.copyOfRange(b, 3, b.length);
        }
        return b;
    }

    // --- Consolidação ---------------------------------------------------------------------------

    private static List<LetterboxdParsedItem> consolidate(Map<String, List<Map<String, String>>> files,
                                                          List<LetterboxdExport.UnresolvedFavorite> unresolved)
    {
        Map<String, Builder> films = new LinkedHashMap<>();
        // Link do filme no Letterboxd (boxd.it/...) → filme: é como o profile.csv aponta os favoritos.
        // Só dos CSVs por filme; no diary/reviews o link é da entrada, não do filme.
        Map<String, Builder> byUri = new HashMap<>();
        for (Map<String, String> row : files.getOrDefault("watched.csv", List.of())) {
            filmWithUri(films, byUri, row).watched = true;
        }
        for (Map<String, String> row : files.getOrDefault("ratings.csv", List.of())) {
            Builder b = filmWithUri(films, byUri, row);
            b.watched = true;
            b.rating = rating(row.get("Rating"));
        }
        for (Map<String, String> row : files.getOrDefault("likes/films.csv", List.of())) {
            filmWithUri(films, byUri, row).liked = true;
        }
        for (Map<String, String> row : files.getOrDefault("watchlist.csv", List.of())) {
            filmWithUri(films, byUri, row).inWatchlist = true;
        }
        for (Map<String, String> row : files.getOrDefault("diary.csv", List.of())) {
            Builder b = film(films, row);
            b.watched = true;
            LocalDate date = date(row.getOrDefault("Watched Date", row.get("Date")));
            if (date != null) {
                b.entries.put(date, new LetterboxdParsedItem.Entry(date, rating(row.get("Rating")),
                        "yes".equalsIgnoreCase(row.get("Rewatch")), null));
            }
        }
        for (Map<String, String> row : files.getOrDefault("reviews.csv", List.of())) {
            Builder b = film(films, row);
            b.watched = true;
            LocalDate date = date(row.getOrDefault("Watched Date", row.get("Date")));
            String review = blankToNull(row.get("Review"));
            if (date != null) {
                LetterboxdParsedItem.Entry existing = b.entries.get(date);
                b.entries.put(date, existing == null
                        ? new LetterboxdParsedItem.Entry(date, rating(row.get("Rating")),
                                "yes".equalsIgnoreCase(row.get("Rewatch")), review)
                        : new LetterboxdParsedItem.Entry(date, existing.rating(), existing.rewatch(), review));
            }
        }
        markFavorites(files.getOrDefault("profile.csv", List.of()), byUri, unresolved);
        films.values().removeIf(b -> b.name == null);
        return films.values().stream().map(Builder::build).toList();
    }

    /**
     * profile.csv tem uma linha com a coluna "Favorite Films": os links dos até 4 favoritos, separados por
     * vírgula e na ordem do perfil. Favorito que não aparece nos outros CSVs (ex.: um favorito que a pessoa
     * nunca marcou como visto) volta em {@code unresolved}, para ser descoberto pelo link na reconciliação.
     */
    private static void markFavorites(List<Map<String, String>> profile, Map<String, Builder> byUri,
                                      List<LetterboxdExport.UnresolvedFavorite> unresolved)
    {
        if (profile.isEmpty()) {
            return;
        }
        String raw = blankToNull(profile.getFirst().get("Favorite Films"));
        if (raw == null) {
            return;
        }
        int rank = 0;
        for (String uri : raw.split(",")) {
            if (rank == MAX_FAVORITES || uri.isBlank()) {
                continue;
            }
            Builder b = byUri.get(normalizeUri(uri));
            if (b == null) {
                unresolved.add(new LetterboxdExport.UnresolvedFavorite(uri.strip(), ++rank));
            } else if (b.favoriteRank == null) {
                b.favoriteRank = ++rank;
                b.watched = true;
            }
        }
    }

    private static Builder filmWithUri(Map<String, Builder> films, Map<String, Builder> byUri, Map<String, String> row)
    {
        Builder b = film(films, row);
        String uri = blankToNull(row.get(URI));
        if (uri != null) {
            byUri.putIfAbsent(normalizeUri(uri), b);
        }
        return b;
    }

    /** "https://boxd.it/2b0o/" e " https://boxd.it/2b0o" são o mesmo link. */
    private static String normalizeUri(String uri)
    {
        String u = uri.strip().toLowerCase(Locale.ROOT);
        return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
    }

    private static Builder film(Map<String, Builder> films, Map<String, String> row)
    {
        String name = blankToNull(row.get("Name"));
        Integer year = year(row.get("Year"));
        String key = (name == null ? "" : name.toLowerCase(Locale.ROOT)) + "|" + year;
        return films.computeIfAbsent(key, k -> new Builder(name, year));
    }

    private static BigDecimal rating(String raw)
    {
        String v = blankToNull(raw);
        if (v == null) {
            return null;
        }
        try {
            BigDecimal r = new BigDecimal(v);
            return r.compareTo(new BigDecimal("0.5")) >= 0 && r.compareTo(new BigDecimal("5")) <= 0
                    && r.multiply(BigDecimal.TWO).stripTrailingZeros().scale() <= 0 ? r.setScale(1) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static LocalDate date(String raw)
    {
        String v = blankToNull(raw);
        try {
            return v == null ? null : LocalDate.parse(v);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static Integer year(String raw)
    {
        String v = blankToNull(raw);
        try {
            return v == null ? null : Integer.valueOf(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String blankToNull(String s)
    {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static final class Builder
    {
        private final String name;
        private final Integer year;
        private boolean watched;
        private BigDecimal rating;
        private boolean liked;
        private boolean inWatchlist;
        private Integer favoriteRank;
        private final Map<LocalDate, LetterboxdParsedItem.Entry> entries = new HashMap<>();

        private Builder(String name, Integer year)
        {
            this.name = name;
            this.year = year;
        }

        private LetterboxdParsedItem build()
        {
            List<LetterboxdParsedItem.Entry> sorted = new ArrayList<>(entries.values());
            sorted.sort(Comparator.comparing(LetterboxdParsedItem.Entry::watchedDate));
            return new LetterboxdParsedItem(name, year, watched, rating, liked, inWatchlist && !watched, sorted, favoriteRank);
        }
    }

    /** CSV RFC 4180: aspas, vírgulas e quebras de linha dentro de campos (reviews). Primeira linha = cabeçalho. */
    static final class Csv
    {
        private Csv()
        {
        }

        static List<Map<String, String>> parse(String text)
        {
            List<List<String>> rows = rows(text);
            if (rows.isEmpty()) {
                return List.of();
            }
            List<Map<String, String>> out = new ArrayList<>();
            for (List<String> r : rows.subList(1, rows.size())) {
                if (r.size() == 1 && r.getFirst().isBlank()) {
                    continue;
                }
                out.add(row(rows.getFirst(), r));
            }
            return out;
        }

        /** Uma linha como mapa, pelo cabeçalho (sem espaços nas pontas dos nomes das colunas). */
        static Map<String, String> row(List<String> header, List<String> r)
        {
            Map<String, String> m = new HashMap<>();
            for (int i = 0; i < header.size() && i < r.size(); i++) {
                m.put(header.get(i).strip(), r.get(i));
            }
            return m;
        }

        /** As linhas cruas (sem cabeçalho), respeitando aspas, vírgulas e quebras dentro de campos. */
        static List<List<String>> rows(String text)
        {
            List<List<String>> rows = new ArrayList<>();
            List<String> row = new ArrayList<>();
            StringBuilder field = new StringBuilder();
            boolean quoted = false;
            for (int i = 0; i < text.length(); i++) {
                char c = text.charAt(i);
                if (quoted) {
                    if (c == '"' && i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else if (c == '"') {
                        quoted = false;
                    } else {
                        field.append(c);
                    }
                } else if (c == '"') {
                    quoted = true;
                } else if (c == ',') {
                    row.add(field.toString());
                    field.setLength(0);
                } else if (c == '\n' || c == '\r') {
                    if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
                        i++;
                    }
                    row.add(field.toString());
                    field.setLength(0);
                    rows.add(row);
                    row = new ArrayList<>();
                } else {
                    field.append(c);
                }
            }
            if (field.length() > 0 || !row.isEmpty()) {
                row.add(field.toString());
                rows.add(row);
            }
            return rows;
        }
    }
}
