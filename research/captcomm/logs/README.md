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

Zeilen mit `#` sind Kommentare und trennen die Läufe.
