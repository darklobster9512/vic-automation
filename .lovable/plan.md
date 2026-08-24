# Indeed-Leads (23.08.) für den Mass-Uploader

Aus der CSV (UTF-16, Tab-getrennt, 72 Zeilen) wurden 64 verwertbare Kontakte im Format `Vorname Nachname E-Mail +49...` erzeugt. Nachnamen, die im Feld `full_name` fehlten, wurden aus der E-Mail abgeleitet (z. B. `ankezeising6@gmail.com` -> Anke Zeising). Telefonnummern sind auf internationales Format normalisiert.

## Zum Kopieren ins Eingabefeld

```text
Slaven Gudelj gudelj.slaven020@googlemail.com +4915901297464
Kristanval Okafor okaforkristanval2007@gmail.com +491633872999
Johyeon Yang qazxcver@gmail.com +4917641987441
Muhammad Jawad Khan m.jawadyousafzai@gmail.com +4917623344535
Melanie Heck melheck@gmx.de +4915153182928
Meltem Özmen Arslan meltemarslan1906@gmail.com +905432110835
Ian Thomas Hey ianthomashey06@gmail.com +4915209204667
Eva Klein eva-klein@hotmail.de +4915253115805
Sharon Joshi shaila_2j@rediffmail.com +4917687946965
Keziban Ince i.keziban@googlemail.com +4915732389903
Anke Zeising ankezeising6@gmail.com +4915563966845
Jennifer Hauck info@jennifer-hauck.com +4917622013119
Ali Raza Warraich razaali3466@gmail.com +351937907144
Anthony Nelson an06395112@gmail.com +4915217738096
Michael Wilhelm nahanni@web.de +4915162722444
Ann-Marie Neitzke ann-marie96@mail.de +491759135882
Marcus Braun marcusbraun2805@web.de +4915118729077
Bjoern Bichler bjoernbichler@hotmail.de +4915129401377
Andreas Seils seils0809@gmail.com +491782826801
Juri Maier juri.maier1@web.de +4917641455814
Nicole Richter richtern2@icloud.com +491755001773
Tanja Katterbach tanja-frechen2006@web.de +491636364309
Jens Meier meier.jens99@gmail.com +4915237643913
Burak Canak burakcanak1995@gmail.com +4915758749715
Astrid Vedder vedder.astrid@web.de +4915736943263
Rob Wolf acid661@googlemail.com +491747027742
Archana Gandhi archanagandh@gmail.com +4915510196144
Tibor Vörös tiborvoeroes1702@gmail.com +491712378398
Mathis Genge mathisgenge@gmail.com +4915757070789
Tamara Kranitz kranitztamara75@gmail.com +4915568186982
Aykut Erçok ercok@gmx.de +4917696517743
Dorry Brenda dorrybrenda3@gmail.com +4915214311797
Monika Voigt mdoerr160259@gmail.com +4915158403777
Nilkanth Deshpande nilkanth_ae@yahoo.com +4917669598677
Anna Maria Manea annamariamanea31@gmail.com +4915125370793
Holger Janßen holgerjanssen@ewe.net +4917643445056
Viki Violeta violeta.nikoli1987@gmail.com +4915202509923
Natalie Berta medo565080@gmail.com +15095166248
Donnie Avant dnnavant@me.com +4917641116920
Daniel Reimann daniel.reimann1@web.de +4917655129176
Alexander Kaufmann alexander.kaufmann@protonmail.ch +491708078953
Zaharov Evdochia evdochiazaharov30@gmail.com +4915214332625
Dominik Brohm brohmdominik671@gmail.com +491751257760
Andi Drewes andreasdrewes749@gmail.com +491746500608
Justin Schmidt jasminaf2@web.de +4917667047298
Shakeel Khan atlantans79@gmail.com +4917664326226
Arbnor Lajqi arbnorlajqi91@gmail.com +4916096437110
Mwäsï Lêë mwasijeff936@gmail.com +4917624981691
Marcel Rimoto Hintz mrh81292@gmail.com +4917665762009
Daniel Heuser dheuser@magenta.de +4915731358393
Nico Kaufmann niohaltern@gmail.com +4915114308345
Marvin Schultz marvinschultz98@yahoo.com +4917672572867
Kevin Korporal korporal016@gmail.com +4917671171476
Joel Konjevic konjevicjoel8@gmail.com +4915562781971
Jan Pavelt paveltjan7@gmail.com +4917674771493
Manuchekhr Dzhumaev manuchekhrdzhumaev@icloud.com +491727308187
Liam Alejandro dorow.benjaminclark@web.de +4915239605278
Kader Amare danielmartinez2272@gmail.com +16237035199
Anke Faendrich a.faendrich@web.de +491752353483
Ann-Christin Lorbach ann_christinlorbach@yahoo.de +491778133398
Marda Black black@gmx.de +491772524721
Yosley Salas Cala rodriguezyelsoy@gmail.com +491607587936
Roman Brammen roman.brammen@gmx.de +4917616712013
Lisa Rios Jimenez lisa.rios98@aol.de +491604942776
```

## Aus Namen aus der E-Mail abgeleitet (11)

Anke Zeising, Marcus Braun, Bjoern Bichler, Mathis Genge, Anna Maria Manea, Joel Konjevic, Jan Pavelt, Ann-Christin Lorbach, Marda Black, Anke Faendrich, Rob Wolf — zusätzlich Schreibkorrekturen bei Burak Canak, Marvin Schultz, Nico Kaufmann, Tamara Kranitz.

## Nicht übernommen (8) — kein erkennbarer Nachname / Fake

- `bfpstar@web.de` (Nummer +123456789)
- `free_user@web.de` ("Sigi")
- `tim871199@gmail.com` ("tim")
- `in_self@web.de` ("Nina")
- `nikkl239@gmx.de` (Zufallsname)
- `cghbghjj@gmail.com` ("bn")
- `blumenstraussrosa@gmail.com` (kein Nachname)
- `aliyaabdullah928@gmail.com` ("Ans ania")

## Hinweise

- 4 Nummern sind nicht deutsch: +90 (Meltem Özmen Arslan), +351 (Ali Raza Warraich), +1 (Natalie Berta, Kader Amare).
- Bei `Liam Alejandro`, `Kader Amare`, `Justin Schmidt`, `Yosley Salas Cala` passen Name und E-Mail nicht zusammen — Name wurde wie im Formular angegeben übernommen.
- Reine Datenaufbereitung, keine Codeänderung nötig.
