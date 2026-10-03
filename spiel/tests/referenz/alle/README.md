# Referenzprotokolle aller Testszenen

Erzeugt am 2026-10-03 mit der TypeScript-Fassung (`spiel/`, Stand
`main` nach Auftrag 5, Phase 0) für jede Szene unter `spiel/tests/szenen/`
mit der gleichnamigen Eingabedatei unter `spiel/tests/eingaben/` (ohne
Eingabedatei: ohne Tasten). Befehl je Szene:

```
npm run lauf -- --szene tests/szenen/<name>.txt --eingabe tests/eingaben/<name>.txt --aus aus/ref/<name>
```

Je Szene zwei Dateien: `<name>.protokoll.csv` und `<name>.objekte.csv`
(Format: `docs/spezifikation-kampf.md`, 11.3 bis 11.5). Prüfsummen in
`PRUEFSUMMEN.md5`.

Diese Dateien sind der Prüfstein für jede andere Fassung des Spiels (zum
Beispiel den Godot-Port): Eine Fassung ist richtig, wenn sie für jede
Szene bitgleiche Dateien erzeugt. Sie werden nur neu erzeugt, wenn sich
das Verhalten nach einer Änderung der Spezifikation absichtlich ändert,
mit Begründung in `docs/scheibe.md`.
