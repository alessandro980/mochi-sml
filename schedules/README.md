# Calendari ufficiali dei turni

Ogni file `AAAA-MM.json` è un mese ufficiale. All'apertura l'app lo unisce ai dati di ogni dispositivo:
- chiave unica = **data + ora**: se la Messa esiste già viene solo aggiornata la squadra/tipo (assegnazioni, presenze e note restano);
- le Messe nuove vengono aggiunte con il bollino **ufficiale**;
- se il responsabile elimina una Messa ufficiale, non viene più ricreata su quel dispositivo;
- gli avvisi con `id` vengono aggiunti una sola volta.

Formato:
```json
{ "id": "2026-12", "titolo": "Turni Dicembre 2026",
  "avvisi": [ { "id": "uff-avviso-xxx", "titolo": "...", "testo": "...", "data": "2026-11-28", "pin": true } ],
  "messe": [ { "data": "2026-12-05", "ora": "18:00", "squadra": "blu", "tipo": "festiva", "note": "Prefestiva" } ] }
```
`squadra`: `blu` | `gialli` | `rossi` | `verdi`. `tipo`: `feriale` | `festiva` | `solennita`.

Dopo aver aggiunto un file: `node tools/build-schedules.mjs` (rigenera `schedules.js`), alza la versione cache in `sw.js` e pubblica.
In alternativa il responsabile può usare nell'app **Turni → 📅 Aggiungi mese**, che crea le Messe sul dispositivo e permette di
esportare il JSON del mese da mettere qui.
