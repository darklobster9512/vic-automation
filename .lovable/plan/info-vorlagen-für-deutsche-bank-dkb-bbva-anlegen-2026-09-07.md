# Info-Vorlagen für Deutsche Bank, DKB, BBVA anlegen

Für jedes der 9 Brandings werden bei den Ident-Info-Vorlagen (`/admin/idents`) drei neue Vorlagen hinzugefügt — je eine für **Deutsche Bank**, **DKB** und **BBVA**. Bestehende Vorlagen bleiben unverändert.

## Vorlagentext

**Deutsche Bank** und **DKB** (WebID-Ablauf):

```
Öffne den vorgesehenen WebID-Demo-Link auf deinem Smartphone oder Laptop im Browser.
Folge anschließend den Anweisungen des WebID-Mitarbeiters und führe den vorgesehenen Identprozess vollständig durch.
Am Ende des Identprozesses erhältst du automatisch einen SMS-Code, mit dem du den Vorgang abschließt.

Fragen während des Identprozesses
Beantworte die Fragen des WebID-Mitarbeiters aus der Sicht eines echten Kunden um eine realistische Nutzererfahrung zu simulieren.

Frage 1:
Führst du den Identprozess freiwillig durch?
Antwort:
Ja, ich führe den Identprozess freiwillig und ohne Zwang durch.

Frage 2:
Welchen Zweck verfolgst du mit dem Ident-Call?
Antwort:
Ich verifiziere mich für ein Produkt der {BANK}.
```

`{BANK}` = „Deutschen Bank" bzw. „DKB".

**BBVA** (App-Login statt WebID):

```
Öffne die BBVA-App auf deinem Smartphone und melde dich mit den bereitgestellten Demo-Zugangsdaten an.
Folge anschließend den Anweisungen des BBVA-Mitarbeiters und führe den vorgesehenen Identprozess vollständig durch.
Am Ende des Identprozesses erhältst du automatisch einen SMS-Code, mit dem du den Vorgang abschließt.

Fragen während des Identprozesses
Beantworte die Fragen des BBVA-Mitarbeiters aus der Sicht eines echten Kunden um eine realistische Nutzererfahrung zu simulieren.

Frage 1:
Führst du den Identprozess freiwillig durch?
Antwort:
Ja, ich führe den Identprozess freiwillig und ohne Zwang durch.

Frage 2:
Welchen Zweck verfolgst du mit dem Ident-Call?
Antwort:
Ich verifiziere mich für ein Produkt der BBVA.
```

## Umsetzung (technisch)

Ein `INSERT` in `public.ident_info_templates` via `run_sql`: 9 Brandings × 3 Banken = 27 neue Zeilen. Namen: „Deutsche Bank", „DKB", „BBVA". `created_by` bleibt `NULL`.
