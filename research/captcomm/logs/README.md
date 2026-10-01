# Logausschnitte

Hier liegen nur kurze, kommentierte Ausschnitte aus den Läufen, auf die
`../notes.md` als Beleg verweist (CSV aus `ramtools.py track`/`changes`).
Die Rohdaten (RAM-Vollabzüge, Snapshots, Savestates, MAME-Konfiguration)
erzeugt `scripts/run.sh` unter `raw/`. Dieser Ordner ist git-ignoriert.

Aufgabe 4 (Speicheradressen):

- `a4_gegenpruefung.txt`: Ausgabe von `scripts/verify_b.sh`, blinde Suchen in
  den Gegenläufen `*_b`
- `a4_position.csv`, `a4_hoehe_aktion.csv`, `a4_lp_spieler.csv`,
  `a4_lp_gegner.csv`, `a4_gegnerzahl.csv`: erzeugt von
  `scripts/belege_a4.sh`

Aufgabe 5 (Messungen), erzeugt von `scripts/belege_a5.sh` nach
`scripts/laeufe_a5.sh`:

- `a5_laufen.csv`: Geschwindigkeit je Eingabesegment
- `a5_schaden.csv`: LP-Abnahmen der Gegner mit Kombostufe
- `a5_schlag.csv`: Zeitachse der Einzel- und Leerschläge, Trefferstopp
- `a5_schutz.csv`: Treffer gegen die Figur, Schutzfenster, Eingriffsläufe

Nachtrag Sprung und Schlagreichweite, erzeugt von `scripts/belege_a7.sh`
nach `scripts/laeufe_a7.sh`:

- `a7_sprung.csv`: alle Sprünge mit Ablauf, Höhe, Weite und Eingaben in der Luft
- `a7_reichweite.csv`: Zusammenfassung und je aktivem Schlagframe Abstand,
  Tiefe und Treffer

Zeilen mit `#` sind Kommentare und trennen die Läufe.
