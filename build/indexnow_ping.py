#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IndexNow ping za Bing i Yandex.
Proveri ključ na: https://www.bing.com/indexnow/getStarted
Pokretanje: cd build && python3 indexnow_ping.py
"""
import json, urllib.request, os

PUB = os.path.join(os.path.dirname(__file__), '..', 'public')
KEY = 'e8f48349a96336902c5de51768eff22a'
HOST = 'rimoteka.com'
ENDPOINTS = [
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
]

def urls_from_sitemap():
    import xml.etree.ElementTree as ET
    sm = ET.parse(os.path.join(PUB, 'sitemap.xml'))
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    out = []
    for url in sm.findall('.//s:url/s:loc', ns):
        out.append(url.text)
    return out

def ping():
    urls = urls_from_sitemap()
    payload = json.dumps({
        'host': HOST,
        'key': KEY,
        'keyLocation': f'https://{HOST}/{KEY}.txt',
        'urlList': urls[:10000]
    }, ensure_ascii=False).encode('utf-8')
    for ep in ENDPOINTS:
        try:
            req = urllib.request.Request(
                ep,
                data=payload,
                headers={'Content-Type': 'application/json; charset=utf-8'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                print(ep, r.status, r.read().decode('utf-8', errors='ignore')[:200])
        except Exception as e:
            print(ep, 'ERROR', e)

if __name__ == '__main__':
    ping()
