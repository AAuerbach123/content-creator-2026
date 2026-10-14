// Kleiner TypeScript-Lader für Prüfskripte (ohne zusätzliche Abhängigkeit):
// transpiliert .ts-Dateien aus src/lib/ im Speicher (CommonJS) und löst relative Importe auf.
// Nutzt das ohnehin installierte `typescript`.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')

export function tsLaden(datei) {
  const cache = new Map()
  const lade = (abs) => {
    if (cache.has(abs)) return cache.get(abs).exports
    const quelle = fs.readFileSync(abs, 'utf8')
    const js = ts.transpileModule(quelle, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    const mod = { exports: {} }
    cache.set(abs, mod)
    const req = (spez) => {
      if (spez.startsWith('.')) {
        const basis = path.resolve(path.dirname(abs), spez)
        for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(basis + ext)) return lade(basis + ext)
        throw new Error('Import nicht gefunden: ' + spez + ' (aus ' + abs + ')')
      }
      return require(spez)
    }
    vm.runInThisContext('(function(exports, require, module){' + js + '\n})', { filename: abs })(mod.exports, req, mod)
    return mod.exports
  }
  return lade(path.resolve(datei))
}
