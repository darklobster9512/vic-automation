import { motion } from "framer-motion";
import { HelpCircle, FileText, Clock, Euro, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Auftragsbearbeitung & Dokumentation",
    icon: FileText,
    items: [
      {
        question: "Was passiert, nachdem ich eine Bewertung eingereicht habe?",
        answer:
          "Nachdem du eine Bewertung eingereicht hast, prüfen wir deine Ergebnisse. Die Prüfung dauert in der Regel 12–24 Stunden. Bei einzelnen Aufträgen kann die Bearbeitung etwas länger dauern. Nach erfolgreicher Prüfung wirst du benachrichtigt und der Auftrag wechselt in deinem Portal automatisch auf den Status „Abgeschlossen“.",
      },
      {
        question: "Wie handhabe ich Aufträge mit angeforderten Nachweisen oder Anhängen?",
        answer:
          "Bei Aufträgen, für die zusätzliche Nachweise oder Anhänge erforderlich sind, reichst du zunächst wie gewohnt deine schriftliche Bewertung ein. Direkt im Anschluss erscheint im Auftrag eine entsprechende Upload-Maske. Dort kannst du die benötigten Dokumente und Nachweise hochladen. Bitte achte darauf, dass alle Anhänge vollständig und gut leserlich hochgeladen werden. Einige Nachweise oder Anhänge erhältst du möglicherweise erst per Post. In diesem Fall kannst du sie hochladen, sobald sie bei dir eingetroffen sind. Sobald alle erforderlichen Anhänge hochgeladen und die vorgesehenen Upload-Slots vollständig befüllt sind, kannst du den Auftrag final einreichen.",
      },
    ],
  },
  {
    title: "Arbeitszeit & Vergütung",
    icon: Euro,
    items: [
      {
        question: "Wie wird meine Arbeitszeit bemessen?",
        answer:
          "Wir tracken deine Arbeitszeit nicht minutengenau. Stattdessen arbeiten wir mit einem auftragsbasierten System, das sich an deinem vereinbarten Wochenstundenpensum orientiert. In deinem Arbeitsvertrag hast du beispielsweise ein Pensum von 10 Stunden pro Woche vereinbart. Auf Grundlage dieses Pensums erhältst du eine entsprechend kalkulierte Anzahl an Aufträgen. Für dich bedeutet das: Wenn du alle dir für dein Pensum zugewiesenen Aufträge vollständig erledigst, gilt dein vereinbartes Arbeitspensum als erfüllt.",
      },
      {
        question: "Wann und wie werde ich vergütet?",
        answer:
          "Deine Vergütung richtet sich nach den Vereinbarungen in deinem Arbeitsvertrag. Dort sind sowohl dein festes Stundenpensum als auch deine monatliche Vergütung festgelegt. Wenn du dein vorgesehenes Pensum erfüllst, also die dir zugewiesenen Aufgaben vollständig erledigst, wird dir die vereinbarte Vergütung in voller Höhe ausgezahlt. Im ersten Beschäftigungsmonat erfolgt die Auszahlung 30 Kalendertage nach deinem ersten Arbeitstag. Ab dem darauffolgenden Monat erfolgt die Auszahlung regulär zum 30. des jeweiligen Monats.",
      },
    ],
  },
];

export default function MitarbeiterFaq() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">FAQ</h1>
        </div>
        <p className="text-muted-foreground">
          Antworten auf die häufigsten Fragen rund um Aufträge, Dokumentation und Vergütung.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <Card key={section.title} className="rounded-2xl shadow-sm border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {section.items.map((item, itemIndex) => (
                <div key={item.question} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
                      {sectionIndex + 1}.{itemIndex + 1}
                    </span>
                    <h3 className="text-base font-semibold text-foreground leading-snug">
                      {item.question}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                    {item.answer}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
