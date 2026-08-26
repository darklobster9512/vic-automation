# Codebricks: Slot-1-Termine auf Slot 2 verschieben (+10 Minuten)

## Ausgangslage (geprüft)

Bei Codebricks GmbH liegen ab heute (26.08.2026) **29 Kennenlerngespräche auf Slot 1**. Der Zeitplan hat zwei Slots: Slot 1 (08:00–14:00) und Slot 2 (08:00–14:30), Intervall 20 Minuten.

Alle bestehenden Slot-2-Termine liegen auf dem 20-Minuten-Raster (:00/:20/:40). Durch die Verschiebung um +10 Minuten landen die verschobenen Termine auf :10/:30/:50 — es gibt daher **keine einzige Kollision**. Die späteste neue Zeit ist 13:50 und liegt noch innerhalb des Slot-2-Fensters.

## Was passiert

Alle 29 Slot-1-Termine ab heute werden auf **Slot 2** gesetzt und die Uhrzeit um **10 Minuten nach hinten** verschoben. Vergangene Termine bleiben unangetastet.

```text
26.08.  08:00 Vanessa-Barbara Lesch   -> 08:10 Slot 2
26.08.  09:20 Rita Badery             -> 09:30 Slot 2
26.08.  10:00 Manuela Beuerlein       -> 10:10 Slot 2
26.08.  11:00 Skye Holzinger          -> 11:10 Slot 2
26.08.  12:00 Michelle Schüller       -> 12:10 Slot 2
26.08.  12:40 Katharina Eulberg       -> 12:50 Slot 2
26.08.  13:00 René Tröger             -> 13:10 Slot 2
26.08.  13:20 Rene Steffen            -> 13:30 Slot 2
26.08.  13:40 Elvedina Selimi         -> 13:50 Slot 2
27.08.  09:00 Jennifer Schuster       -> 09:10 Slot 2
27.08.  10:00 Simon Domagala          -> 10:10 Slot 2
27.08.  11:00 Martin Windeisen        -> 11:10 Slot 2
27.08.  11:20 David Meyer             -> 11:30 Slot 2
27.08.  12:00 Dominik Kaufmann        -> 12:10 Slot 2
27.08.  12:20 Jürgen Kraus            -> 12:30 Slot 2
27.08.  13:00 Monika Pachl            -> 13:10 Slot 2
28.08.  09:20 Andreja Patrcevic       -> 09:30 Slot 2
28.08.  10:00 Simone Knepper          -> 10:10 Slot 2
28.08.  11:00 Debby Neu               -> 11:10 Slot 2
28.08.  11:20 Christopher Höck        -> 11:30 Slot 2
28.08.  12:00 Anna Wallner            -> 12:10 Slot 2
31.08.  08:40 Petra Glismann          -> 08:50 Slot 2
31.08.  09:40 Jördis Rannenberg       -> 09:50 Slot 2
31.08.  10:20 Vincent Buck            -> 10:30 Slot 2
31.08.  11:20 Anna-Lucia Pouth Pouth  -> 11:30 Slot 2
31.08.  12:20 Melanie Hasselbring     -> 12:30 Slot 2
31.08.  13:40 Julia Strehlow          -> 13:50 Slot 2
02.09.  12:40 Laura Hielkema          -> 12:50 Slot 2
18.09.  11:00 Eva Diekel              -> 11:10 Slot 2
```

Es werden **keine E-Mails und keine SMS** verschickt — die Änderung ist rein intern.

## Technische Details

- Einmaliges Daten-Update auf `interview_appointments`: `slot_index = 2` und `appointment_time = appointment_time + interval '10 minutes'`, gefiltert auf die 29 Termin-IDs (Branding Codebricks, `appointment_date >= current_date`, aktuell Slot 1).
- Keine Code- oder Schemaänderung.
