# Aktueller Buchungsablauf: 1. Arbeitstag

Keine Codeänderung erforderlich.

- Der Mitarbeiter reicht zuerst seine Vertragsdaten im eingeloggten Bereich unter `/mitarbeiter/arbeitsvertrag` ein.
- Sobald ein Admin den Arbeitsvertrag genehmigt, wird eine E-Mail „Vertrag genehmigt“ versendet.
- Diese E-Mail enthält den Button „Termin für 1. Arbeitstag buchen“.
- Der Button öffnet den öffentlichen Buchungslink `/erster-arbeitstag/:contractId`.
- Im eingeloggten `/mitarbeiter`-Bereich gibt es aktuell keinen separaten Buchungsbutton.