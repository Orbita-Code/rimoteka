#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SJ-5 — sastavlja PREDLOG objašnjenja (napisanih svojim rečima) za osnove iz grupa A i B u jedan pregled za vlasnicu.
Ulaz: scratchpad/sj5-batch-NN-{A,B}.json (reči + OCR Matice) i scratchpad/sj5-def-NN.json (objašnjenja).
Izlaz: AUDIT/SJ-5-razvrstano/PREDLOG-objasnjenja.md (tabela za odluku) + PREDLOG-objasnjenja.json (za unos posle „da").
Ništa se ne menja u rečniku – to radi zaseban korak tek posle odobrenja.
Pokretanje: python3 scripts/sj5-sastavi-predlog.py <scratchpad-dir>
"""
import json, os, re, sys, glob
KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = sys.argv[1]
IZ = os.path.join(KOREN, 'AUDIT/SJ-5-razvrstano')
IJEK = re.compile(r'\b\w*(ije|rje|vje|mje|bje|pje|dje|tje|sje|lje|nje)\w*\b', re.I)
IJEK_LOSE = re.compile(r'\b(vrijem|riječ|rječn|mjest|dijet|mlijek|snijeg|uopć|također|vidjel|htjel|htjet|živjel|razumjel|cijel|dijel|lijep|lijek|svijet|čovjek|djec|djev|mjer|vjer|pjes|tjel|sjed|cvijet|cvjet|zvijezd)', re.I)
def provera(d):
    p = []
    if '—' in d: p.append('dugačka crta')
    if re.search(r', (i|pa|te|ni) ', d): p.append('zarez pred i/pa/te/ni')
    if IJEK_LOSE.search(d): p.append('ijekavica?')
    if '"' in d: p.append('ravni navodnici')
    if len(d.split()) > 22: p.append('predugo')
    if not d.strip(): p.append('prazno')
    return p
def main():
    reci = {}
    for f in sorted(glob.glob(os.path.join(S, 'sj5-batch-*.json'))):
        g = 'A' if f.endswith('-A.json') else 'B'
        n = int(os.path.basename(f).split('-')[2])
        for z in json.load(open(f, encoding='utf-8')):
            reci[z['x']] = {'grupa': g, 'serija': n, 'primeri': z['primeri_oblika'], 'matica': z.get('matica_ocr', '')}
    defs = {}
    for f in sorted(glob.glob(os.path.join(S, 'sj5-def-*.json'))):
        try: defs.update(json.load(open(f, encoding='utf-8')))
        except Exception as e: print('⚠️', f, e)
    nema = [x for x in reci if x not in defs]
    out = []
    for x, z in reci.items():
        d = defs.get(x)
        if not d: continue
        out.append({'x': x, 'grupa': z['grupa'], 'serija': z['serija'], 'primeri': z['primeri'], 'matica': z['matica'][:220],
                    'def': (d.get('def') or '').strip(), 'vrsta': d.get('vrsta', ''), 'sigurnost': d.get('sigurnost', ''), 'greske': provera(d.get('def') or '')})
    json.dump(out, open(os.path.join(IZ, 'PREDLOG-objasnjenja.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    A = [o for o in out if o['grupa'] == 'A']; B = [o for o in out if o['grupa'] == 'B']
    prov = [o for o in out if o['sigurnost'] != 'sigurno']; gr = [o for o in out if o['greske']]
    with open(os.path.join(IZ, 'PREDLOG-objasnjenja.md'), 'w', encoding='utf-8') as f:
        f.write('# SJ-5 – PREDLOG objašnjenja za osnove kojih nema u rečniku (za odluku vlasnice)\n\n')
        f.write(f'> Objašnjenja su napisana svojim rečima (Matica je samo izvor značenja, ne prepis). Ništa nije uneto u rečnik.\n')
        f.write(f'> Ukupno: {len(out)} osnova (A – Matica ima: {len(A)}; B – Matica nema, oblici živi: {len(B)}). Bez objašnjenja: {len(nema)}. Označeno „proveriti": {len(prov)}. Sa formalnom greškom: {len(gr)}.\n\n')
        f.write('Odluka po grupi: „da za A" = sve osnove iz A ulaze u rečnik sa ovim objašnjenjem; pojedinačne izmene: „za X piši …" ili „X ne".\n\n')
        if prov:
            f.write('## PRVO OVO – označeno „proveriti" (agent nije bio siguran)\n\n| X | grupa | oblici | predlog objašnjenja | odluka |\n|---|---|---|---|---|\n')
            for o in prov: f.write(f"| {o['x']} | {o['grupa']} | {o['primeri']} | {o['def']} | |\n")
            f.write('\n')
        for ime, lst in (('A – Matica IMA osnovu', A), ('B – Matica NEMA osnovu, oblici žive u tekstovima', B)):
            f.write(f'## {ime} ({len(lst)})\n\n| X | vrsta | oblici | objašnjenje | odluka |\n|---|---|---|---|---|\n')
            for o in sorted(lst, key=lambda o: o['x']):
                f.write(f"| {o['x']} | {o['vrsta']} | {o['primeri']} | {o['def']} | |\n")
            f.write('\n')
    print(f'osnova {len(reci)} · sa objašnjenjem {len(out)} · bez {len(nema)} · proveriti {len(prov)} · formalne greške {len(gr)}')
    for o in gr[:15]: print('  ⚠️', o['x'], o['greske'], '→', o['def'][:90])
    if nema: print('  bez objašnjenja (prvih 10):', nema[:10])
if __name__ == '__main__': main()
