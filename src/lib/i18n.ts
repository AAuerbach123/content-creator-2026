// Zentrales DE/EN-Wörterbuch (Regel 6).
// Regel: jeder neue sichtbare String bekommt hier einen Schlüssel; nirgends im Code
// harte Strings, die der Nutzer sieht.

import type { Sprache } from './types'

export type Woerterbuch = Record<string, Record<Sprache, string>>

export const dict = {
  // Kopfbereich
  appName: { de: 'ContentCreator2026', en: 'ContentCreator2026' },
  phaseLabel: { de: 'Phase 0 · Fundament', en: 'Phase 0 · Foundation' },

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
  kiMikro: { de: 'Sprechen (bald)', en: 'Voice (soon)' },
  kiHinweis: {
    de: 'Die KI-Anbindung folgt in Phase 1. Der Rahmen steht jetzt.',
    en: 'AI wiring lands in phase 1. The frame is set now.',
  },

  // Karten
  cardNewJob: { de: 'Neuer Job', en: 'New Job' },
  cardNewJobHint: { de: 'Leeren Job in der lokalen DB anlegen', en: 'Create an empty job in local DB' },
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
} as const satisfies Woerterbuch

export type Schluessel = keyof typeof dict

export function uebersetze(schluessel: Schluessel, sprache: Sprache): string {
  return dict[schluessel][sprache]
}
