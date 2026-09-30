// Zentrales DE/EN-Wörterbuch (Regel 6).
// Regel: jeder neue sichtbare String bekommt hier einen Schlüssel; nirgends im Code
// harte Strings, die der Nutzer sieht.

import type { Sprache } from './types'

export type Woerterbuch = Record<string, Record<Sprache, string>>

export const dict = {
  // Kopfbereich
  appName: { de: 'ContentCreator2026', en: 'ContentCreator2026' },
  phaseLabel: { de: 'Phase 1 · KI-Dialog', en: 'Phase 1 · AI Dialog' },

  // KI-Zentrum
  kiPrompt: {
    de: 'Was produzieren wir heute?',
    en: 'What are we producing today?',
  },
  kiPlaceholder: {
    de: 'Beschreib dein Ziel — oder lade eine Vorlage hoch. Ich frage nach, was ich brauche.',
    en: 'Describe your goal — or upload a reference. I will ask what I need.',
  },
  kiSenden: { de: 'Los', en: 'Go' },
  kiVorlage: { de: 'Vorlage hochladen', en: 'Upload reference' },
  kiMikro: { de: 'Sprechen', en: 'Voice' },
  kiMikroAus: { de: 'Mikro aus', en: 'Mic off' },
  kiHinweis: {
    de: 'Ich starte den Dialog und lege einen Job an, sobald du „Los" drückst.',
    en: 'I start the dialog and create a job as soon as you press "Go".',
  },

  // Karten
  cardNewJob: { de: 'Neuer Job', en: 'New Job' },
  cardNewJobHint: { de: 'Frisch mit der KI starten', en: 'Start fresh with the AI' },
  cardActiveJobs: { de: 'Laufende Jobs', en: 'Active Jobs' },
  cardActiveJobsHint: { de: 'Gespeicherte Jobs weiterbearbeiten', en: 'Continue saved jobs' },
  cardBrandKits: { de: 'Brand-Kits', en: 'Brand Kits' },
  cardBrandKitsHint: { de: 'CI: Farben, Schriften, Logos', en: 'CI: colours, fonts, logos' },
  cardTemplates: { de: 'Vorlagen', en: 'Templates' },
  cardTemplatesHint: { de: 'Zeitungs-CIs, Formatvorlagen', en: 'Newspaper CIs, format templates' },
  cardAssets: { de: 'Asset-Bibliothek', en: 'Asset library' },
  cardAssetsHint: { de: 'Bilder, Videos, Audios', en: 'Images, videos, audios' },
  cardExports: { de: 'Exporte', en: 'Exports' },
  cardExportsHint: { de: 'Fertige Abgaben je Kanal', en: 'Finished deliverables per channel' },
  cardRufnummern: { de: 'Rufnummern', en: 'Phone numbers' },
  cardRufnummernHint: {
    de: 'Wissensquiz + Geldregen je Zeitung',
    en: 'Wissensquiz + Geldregen per newspaper',
  },
  cardComingSoon: { de: 'kommt bald', en: 'coming soon' },

  // Debug-Sektion (bleibt bis Phase 1 die richtige „Laufende Jobs"-Ansicht liefert)
  debugTitle: { de: 'IndexedDB-Test · Store „jobs"', en: 'IndexedDB test · store "jobs"' },
  debugEmpty: {
    de: 'Noch keine Jobs. Klick oben auf „Neuer Job" — der Eintrag bleibt nach Reload erhalten.',
    en: 'No jobs yet. Click "New Job" above — entries survive a reload.',
  },
  debugDelete: { de: 'Löschen', en: 'Delete' },
  debugError: { de: 'Fehler', en: 'Error' },

  // Tab-Wächter
  tabGuard: {
    de: '⚠ ContentCreator2026 ist bereits in einem anderen Tab dieses Browsers geöffnet. Bitte schließe den anderen Tab, um Datenkonflikte zu vermeiden.',
    en: '⚠ ContentCreator2026 is already open in another tab of this browser. Please close the other tab to avoid data conflicts.',
  },

  // Sprach-Umschalter
  langAria: { de: 'Sprache umschalten', en: 'Switch language' },

  // Job-Editor / KI-Dialog (Phase 1)
  jobZurueck: { de: '← Zur Übersicht', en: '← Back to overview' },
  jobUmbenennen: { de: 'Titel ändern', en: 'Rename' },
  jobTitelPlaceholder: { de: 'Job-Titel', en: 'Job title' },

  wegAuswahlTitel: { de: 'Wie starten wir?', en: 'How do we start?' },
  wegAuswahlHinweis: {
    de: 'Wähle den Einstieg. Ich passe den Dialog an.',
    en: 'Pick your entry. I will adapt the dialog.',
  },
  wegA: { de: 'Nur ein Ziel', en: 'Just a goal' },
  wegAHinweis: {
    de: 'Ich stelle bis zu 5 Fragen und schlage drei Richtungen vor.',
    en: 'I ask up to 5 questions and propose three directions.',
  },
  wegB: { de: 'Vorstellung im Kopf', en: 'Idea in mind' },
  wegBHinweis: {
    de: 'Ich frage, bis deine Vorstellung greifbar ist.',
    en: 'I probe until your idea is concrete.',
  },
  wegC: { de: 'Vorlage hochladen', en: 'Upload reference' },
  wegCHinweis: {
    de: 'Ich analysiere die Vorlage und frage per Multiple Choice.',
    en: 'I analyse the reference and ask via multiple choice.',
  },

  dialogUeberschrift: { de: 'Dialog mit der KI', en: 'AI dialog' },
  dialogPlaceholder: { de: 'Antwort schreiben oder sprechen …', en: 'Type or speak your answer …' },
  dialogSenden: { de: 'Senden', en: 'Send' },
  dialogLaedt: { de: 'KI denkt …', en: 'AI is thinking …' },
  dialogFehler: { de: 'Die KI hat gerade nicht geantwortet.', en: 'The AI did not respond.' },
  dialogRohtext: {
    de: 'KI-Antwort war kein sauberes JSON — Rohtext:',
    en: 'AI response was not clean JSON — raw text:',
  },

  richtungenTitel: { de: 'Drei Richtungen zur Wahl', en: 'Three directions to choose' },
  richtungenHinweis: {
    de: 'Klick eine Richtung an — die KI verfeinert sie dann mit Multiple Choice.',
    en: 'Click one direction — the AI refines it via multiple choice.',
  },
  richtungWaehlen: { de: 'Diese Richtung', en: 'Use this' },

  schrittplanTitel: { de: 'Schrittplan', en: 'Step plan' },
  schrittplanLeer: {
    de: 'Noch kein Schrittplan. Die KI erzeugt ihn nach dem Briefing.',
    en: 'No step plan yet. The AI creates it after the briefing.',
  },
  schrittAnnehmen: { de: 'Annehmen', en: 'Accept' },
  schrittAendern: { de: 'Ändern', en: 'Change' },
  schrittSelbst: { de: 'Selbst machen', en: 'DIY' },
  schrittOffen: { de: 'offen', en: 'open' },
  schrittVorschlag: { de: 'Vorschlag da', en: 'proposal ready' },
  schrittAngenommen: { de: 'angenommen', en: 'accepted' },
  schrittManuell: { de: 'manuell', en: 'manual' },

  mcTitel: { de: 'Vorlagen-Analyse', en: 'Reference analysis' },
  mcHinweis: {
    de: 'Bestätige je Merkmal, ob wir aus der Vorlage, aus dem Brand-Kit oder frisch arbeiten.',
    en: 'Confirm per feature whether we take from reference, brand kit, or start fresh.',
  },

  verlaufTitel: { de: 'KI-Verlauf', en: 'AI history' },
  verlaufLeer: { de: 'Noch keine KI-Aktion für diesen Job.', en: 'No AI action for this job yet.' },
  verlaufKosten: { de: 'Kosten (geschätzt)', en: 'Estimated cost' },

  vorlageUploadTitel: { de: 'Vorlage hochladen', en: 'Upload reference' },
  vorlageUploadHinweis: {
    de: 'PNG oder JPG. Die KI erkennt Farben, Schriften und Textgefäße.',
    en: 'PNG or JPG. The AI detects colours, fonts, and text slots.',
  },
  vorlageUploadDrop: { de: 'Datei hier ablegen oder klicken', en: 'Drop file here or click' },
  vorlageAnalysiert: { de: 'Vorlage analysiert.', en: 'Reference analysed.' },
  vorlageAnalyseFehler: { de: 'Analyse fehlgeschlagen.', en: 'Analysis failed.' },

  kanalWahl: { de: 'Kanal wählen', en: 'Pick channel' },
  kanalKeiner: { de: 'noch offen', en: 'not decided' },

  briefingZusammenfassung: { de: 'Briefing-Zusammenfassung', en: 'Briefing summary' },
  briefingWeiter: { de: 'Weiter zu den Richtungen', en: 'Continue to directions' },
  briefingSchrittplan: { de: 'Schrittplan erzeugen', en: 'Generate step plan' },

  mikroNichtVerfuegbar: {
    de: 'Spracheingabe wird von diesem Browser nicht unterstützt.',
    en: 'Voice input not supported in this browser.',
  },
  mikroFehler: { de: 'Mikro-Fehler', en: 'Mic error' },
} as const satisfies Woerterbuch

export type Schluessel = keyof typeof dict

export function uebersetze(schluessel: Schluessel, sprache: Sprache): string {
  return dict[schluessel][sprache]
}
