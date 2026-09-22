#!/usr/bin/env bash
# Podsetnik na početku SVAKE sesije: koliko je otvorenih nalaza iz audita i šta je prvo.
# Čita AUDIT/NALAZI-OTVORENI.md (odeljak „STANJE NA DAN …" na vrhu). Ne menja ništa.
# Zahtev vlasnice 22.09.2026: „treba mi neko ko će stalno da me podseća na stvari iz audita koje nisu rešene".
cd "$(dirname "$0")/.." || exit 0
F=AUDIT/NALAZI-OTVORENI.md; [ -f "$F" ] || exit 0
python3 - "$F" <<'PY'
import re,sys,datetime,os,glob
t=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'## STANJE NA DAN (\d\d)\.(\d\d)\.(\d{4})(.*?)(?=\n## )',t,re.S)
if not m: print('[audit] nema odeljka „STANJE NA DAN" u NALAZI-OTVORENI.md'); sys.exit(0)
d,mo,y,body=m.groups()
def sek(ime):
    mm=re.search(r'\*\*'+ime+r'[^*]*\*\*(.*?)(?=\n\*\*|\Z)',body,re.S); return mm.group(1) if mm else ''
def ids(s):
    # stavke: redovi „- **ID**" ILI delovi razdvojeni „·"; uzima se samo ID na POČETKU stavke (ne pomenuti u opisu)
    out=[]
    for l in s.splitlines():
        l=l.strip()
        if l.startswith('- **'): out.append(l[4:].split('**')[0].strip()); continue
        for deo in l.split('·'):
            m=re.match(r'\s*\**([A-Z]{1,3}-\d+[a-z]?(?:\.\.\d+|/[A-Z]{1,3}-\d+)?)',deo.strip().lstrip('*'))
            if m: out.append(m.group(1))
    return out
vis=ids(sek('VISOKO')); sre=ids(sek('SREDNJE')); nis=ids(sek('NISKO')); kri=ids(sek('KRITIČNO'))
audits=sorted(glob.glob('AUDIT/????-??-??-audit.md')); last=audits[-1][6:16] if audits else '?'
dana=(datetime.date.today()-datetime.date.fromisoformat(last)).days if audits else 0
print(f'[audit] otvoreno: kritično {len(set(kri))} · visoko {len(set(vis))} · srednje {len(set(sre))} · nisko {len(set(nis))}  (stanje od {d}.{mo}.{y}, poslednji audit {last}, pre {dana} d{" – VREME JE ZA NOV AUDIT" if dana>=3 else ""})')
prvi=[l.strip('- ').split(' ',1) for l in sek('VISOKO').splitlines() if l.strip().startswith('- **')]
for i,(idv,opis) in enumerate(prvi[:5],1):
    kratko=re.sub(r'\(`[^)]*`[^)]*\)','',opis)[:110].strip()
    print('  %d. %s %s' % (i, idv.strip('*'), kratko))
if len(prvi)>5: print(f'  … i još {len(prvi)-5} visokih; pa {len(set(sre))} srednjih. Spisak: AUDIT/NALAZI-OTVORENI.md')
print('[audit] pravilo: prvo se popravljaju bagovi, pa se gradi novo. Podsetnik: scripts/podsetnik-audit.sh')
PY
