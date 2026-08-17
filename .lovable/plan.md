# Doppelte Bewerbungen bei Codebricks löschen

## Ziel
Alle Bewerbungen bei Codebricks entfernen, deren E-Mail-Adresse bereits bei LIMEX Solutions existiert.

## Umfang
- Codebricks hat aktuell 75 Bewerbungen.
- 21 davon haben eine E-Mail, die auch bei LIMEX vorkommt — diese werden gelöscht.
- Alle 21 haben Status "Neu", keinen Gesprächstermin, keinen Probetag, keinen 1. Arbeitstag und keinen Arbeitsvertrag. Es gehen also keine Termine oder Vertragsdaten verloren.

Betroffene Namen: Ousama Ajnane, Nicola Aleff, Michelle Bernhardt, Lierath Bianka, Nataliya Byglewski (2x), Matthias Eltschkner, Julia Fritzsche, Lucas Graf, Felix Grefe (2x), Jaclyn Grefer (3x), Keziban Ince, Stefanie Alexandra Kazimirov, Armin Kuch, Randy-Scott, Nicole Seebruch, Christian Selenka, Bernd Waldera.

## Vorgehen
- Reine Datenlöschung in der Tabelle `applications`, eingeschränkt auf das Codebricks-Branding und den E-Mail-Abgleich mit LIMEX.
- Die LIMEX-Bewerbungen bleiben unverändert.
- Keine E-Mails oder SMS werden ausgelöst, keine Code-Änderung nötig.
