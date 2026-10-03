# Portregeln: TypeScript nach GDScript (Auftrag 6)

Gelten für jede Datei unter `godot/kern/` und `godot/pruef/`. Ziel: Der Kern
erzeugt für jede Szene bitgleiche Protokolle wie `spiel/src/kern/`. Deshalb
wird **Zeile für Zeile** portiert: gleiche Namen, gleiche Reihenfolge,
gleiche Kommentare (sinngemäß, auf Deutsch), kein „Verbessern“, kein
Umordnen von Anweisungen, kein Vereinfachen. Auch ein vermeintlicher Fehler
der TypeScript-Fassung bleibt erhalten und kommt als Befund in den Bericht.

## Dateien und Klassen

- `spiel/src/kern/<pfad>/<name>.ts` → `godot/kern/<pfad>/<name>.gd` mit
  `class_name Kern<Pfad><Name>` (CamelCase, Unterstriche und Schrägstriche
  entfallen): `festkomma` → `KernFestkomma`, `figur/zustaende` →
  `KernFigurZustaende`, `gegner/nah_gehen` → `KernGegnerNahGehen`,
  `gegner/boss` → `KernGegnerBoss`. Ausnahmen: `figur/figur.ts` →
  `KernFigur`. `spiel/src/pruef/<name>.ts` → `godot/pruef/<name>.gd`
  mit `class_name Pruef<Name>` (`PruefEingabe`, `PruefSzene`,
  `PruefProtokoll`, `PruefPruefung`).
- Alle Funktionen sind `static func` mit **demselben Namen** wie in
  TypeScript (camelCase bleibt). Aufruf aus anderen Modulen:
  `KernBahn.bahnStarten(...)`. Kein Zustand in statischen Variablen; aller
  Zustand steht in der Welt (`KernWelt`).
- Konstanten: `KernWerte.NAME`. Eigene Modulkonstanten als `const`.
  Exportierte Konstanten anderer Module (`EREIGNIS`, `TASTE_L` …) mit dem
  Klassennamen des Moduls.
- Typen: Exportierte TypeScript-Schnittstellen werden **innere Klassen** der
  Modulklasse mit demselben Namen und denselben Feldnamen, Standardwerte in
  der Deklaration, Erzeugung mit `.new()` und danach Felder setzen
  (`KernStage.Stage`, `KernWelt.Eingabe`, `KernEntitaeten.Gegner` …).
  `extends` zwischen Schnittstellen wird `extends KernX.Y`. Unexportierte
  Schnittstellen und anonyme Objekttypen (Rückgaben wie `{ lp, schaden }`):
  `Dictionary` mit denselben Schlüsseln, Zugriff `d["lp"]`, bei optionalen
  Schlüsseln `d.get("lp")`.
- Wo die Namen von Godot-Klassen kollidieren (zum Beispiel `Animation`),
  hängt die vorhandene Datei den Namen ab (`Animationszeiger`); im Zweifel
  `godot/kern/entitaeten.gd` ansehen.

## Typabbildung

| TypeScript | GDScript |
|---|---|
| `number` (ganz), `Fest`, `Tasten`, `Blick` | `int` |
| `boolean` | `bool` |
| `string`, Zeichenketten-Aufzählungen, `SlotKey` | `String` |
| `T \| null`, `T \| undefined`, `x?: T` | `Variant` (null oder T); Klassentypen dürfen `null` direkt tragen |
| `T[]` | `Array` (oder `Array[int]`, `Array[String]`, wo es hilft) |
| `Record<string, V>`, `Map`, `Set` | `Dictionary` (Set: Schlüssel → true); Einfügereihenfolge bleibt erhalten |
| `a ?? b` | `b if a == null else a` |
| Funktionsargument `(...felder)` | ein `Array`-Parameter (siehe `KernEreignisse.ereignis(welt, ["KE","F",2])`) |
| Rückruf `(x) => y` | `Callable` |

Alle Variablen, Parameter und Rückgaben sind statisch typisiert. `Variant`
nur für nullbare Werte. `untyped_declaration` ist als Warnung eingeschaltet:
keine Warnungen hinterlassen.

## Zahlen (der wichtigste Abschnitt)

- GDScript-`int` hat 64 Bit. Wo TypeScript `| 0` schreibt (32-Bit-
  Umbruch), ruft der Port `KernFestkomma.zu32(x)`; `Math.imul(a, b)` ist
  `KernFestkomma.zu32(a * KernFestkomma.zu32(b))`. Die Festkommafunktionen
  (`add`, `sub`, `mul`, `mulGanz`, `divGanz`, `ganz` …) stehen schon in
  `KernFestkomma`; sie 1:1 benutzen, nie durch eigene Rechnung ersetzen.
- **Division**: GDScript-`/` auf `int` rundet zur 0, JavaScript `Math.floor(a / b)`
  rundet nach −∞. Immer `KernFestkomma.divGanz(a, b)` (nur positive `b`) benutzen,
  wo TypeScript `divGanz` oder `Math.floor(a / b)` benutzt. `Math.trunc` oder
  `(a / b) | 0` entsprechen dagegen GDScript `a / b`.
- `%` verhält sich wie in JavaScript (Vorzeichen des Dividenden).
- `>>` ist arithmetisch (Vorzeichen bleibt), `>>>` wird nicht gebraucht.
- `Math.abs/min/max` → `absi`, `mini`, `maxi`; Vorzeichen → `signi`;
  `Math.floor` auf ganzzahligen Quotienten → `divGanz`; `Math.round` →
  `floori(x + 0.5)` ist hier **nicht erlaubt** (kein `float` im Kern); stelle
  die Rechnung mit Ganzzahlen nach und melde den Fall.
- **Verboten im Kern** (auch in Kommentaren! Ein Test sucht die Wörter in
  `godot/kern/`): `float`, `Vector2`, `Rect2`, `randi`, `randf`, `Time.`, `OS.`,
  `signal`. Kein `Node`, keine Szene, kein `Input`, kein `print` in der Logik.
- Kein Zufall außer über `KernZufall` (gleiche Reihenfolge der Ziehungen!).

## Sprachfallen

- `===`/`!==` → `==`/`!=`. Zeichenkettenvergleich wie in TS.
- `for (const x of liste)` → `for x: Typ in liste:`; Indexschleifen mit
  `range(...)`. Iteration immer in derselben Reihenfolge wie in TS.
- `liste.push(x)` → `append`, `.length` → `size()`, `.includes(x)` → `has(x)`,
  `[...liste]` → `duplicate()`, `liste.slice(a, b)` → `slice(a, b)`,
  `.find/.filter/.map` → Schleife, Reihenfolge erhalten.
- **Sortieren**: `Array.sort_custom` ist nicht stabil, `Array.sort` auch nicht.
  Wo TypeScript sortiert, einen stabilen Einfügesort selbst schreiben, der
  dieselbe Ordnung wie `Array.prototype.sort` (stabil) ergibt.
- Wörterbuchzugriff auf fehlende Schlüssel ist ein Fehler: `d.get(k, 0)`
  (`e.timer[k] ?? 0` → `e.timer.get(k, 0)`).
- Schlüsselwörter und Namen, die in GDScript nicht als Bezeichner gehen:
  `class`, `signal`, `match`, `var`, `const`, `func`, `in`, `is`, `as`, `self`,
  `super`, `pass`, `static`, `enum`, `trait`, `await`, `range` (als lokaler Name
  vermeiden), `bool`, `int`, `String`. In dem Fall mit Endung `_wert` oder
  Ähnlichem umbenennen und im Bericht nennen.
- Innere Klassen mit Konstruktorargumenten gibt es nicht; `_init` ohne
  Argumente genügt, sonst Felder nach `.new()` setzen.
- `throw` → `push_error("…")` und danach einen unauffälligen Rückgabewert.
  Die Fehlerfälle kommen in den Szenen nicht vor; die Kontrolle bleibt erhalten.
- Mehrere Rückgabewerte: `Dictionary` oder `Array`, wie TypeScript sie als
  Objekt bzw. Tupel gibt.
- Kommentare: Die TypeScript-Kommentare bleiben (deutsch), damit die Datei
  Zeile für Zeile mit dem Original verglichen werden kann.

## Prüfen

- Syntax und Namensauflösung einer Datei: `godot --headless --path godot
  --check-only --script res://kern/<datei>.gd` (Godot liegt unter
  `/tmp/Godot_v4.7.2-stable_linux.x86_64`). **Nie `--import` oder `--editor`
  aufrufen** (schreibt gemeinsame Zwischendateien, andere Agenten laufen
  gleichzeitig).
- Die übrigen Module sind zunächst leere Platzhalter (nur `class_name`). Fehler
  der Art „Static function X not found in base KernY“ oder „Could not find
  nested type“ für Dinge aus **anderen** Modulen verschwinden, wenn dieses
  Modul fertig ist; alle anderen Fehler und Warnungen in der eigenen Datei
  sind zu beheben.
- Nur die dir zugewiesenen Dateien schreiben. Nicht committen (das macht der
  Orchestrator). Vorhandene Dateien (`werte.gd`, `festkomma.gd`, `zufall.gd`,
  `tasten.gd`, `entitaeten.gd`, `ereignisse.gd`, `welt.gd`) nicht ändern; fehlt
  dort etwas, im Bericht vorschlagen.
- Schlussbericht: (1) Liste aller portierten Funktionen mit GDScript-
  Signatur, (2) Besonderheiten und Abweichungen von der Zeile-für-Zeile-
  Übersetzung, (3) Befunde zur TypeScript-Fassung, (4) offene Zweifel.
