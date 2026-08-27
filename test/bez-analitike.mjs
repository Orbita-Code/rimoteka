/* bez-analitike.mjs — merenje ne sme da ulazi u statistiku sajta (26.08.2026)
 *
 * ZAŠTO. Test i merne skripte otvaraju desetine svežih konteksta po prolazu,
 * svaki bez kolačića — a to je za GA4 svaki put NOV KORISNIK. Pušteno protiv
 * produkcije, jedan prolaz je u statistiku ubacivao desetine lažnih poseta
 * kratkog trajanja. Izmereno pre popravke: grad iz kog se test pušta imao je
 * 206 korisnika, od toga 203 „nova", uz prosečno zadržavanje od 12 sekundi —
 * dok je stvarna publika imala 2 minuta i 56 sekundi.
 *
 * ZAŠTO PRESRETANJE, A NE BLOKADA DOMENA. Prvi pokušaj je bio Chromium-ov
 * `--host-resolver-rules` (domen se preusmeri u prazno). Pregledač tada prijavi
 * `ERR_CONNECTION_REFUSED`, pa svaka provera „nula grešaka u konzoli" počne da
 * pada. Ovako se zahtev presreće i odgovara mu se praznim 200: nijedan bajt ne
 * izađe, a konzola ostaje čista.
 *
 * KAKO SE KORISTI:
 *     import { umotaj } from './bez-analitike.mjs';
 *     const browser = umotaj(await chromium.launch());
 * Posle toga svaki `newContext` i `newPage` automatski dobija blokadu — pa se
 * ne može promašiti kontekst koji neko doda kasnije.
 */
export const OBRAZAC = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;

export function umotaj(browser) {
  async function blokiraj(ctx) {
    await ctx.route(OBRAZAC, r => r.fulfill({
      status: 200,
      headers: { 'content-type': 'application/javascript', 'x-blokirano-u-testu': '1' },
      body: ''
    }));
    return ctx;
  }
  const _nc = browser.newContext.bind(browser);
  browser.newContext = async (...a) => blokiraj(await _nc(...a));
  const _np = browser.newPage.bind(browser);
  browser.newPage = async (...a) => { const p = await _np(...a); await blokiraj(p.context()); return p; };
  return browser;
}
