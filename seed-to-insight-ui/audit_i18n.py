#!/usr/bin/env python3
"""Phase 11 — Audit hardcoded user-facing strings in src/."""
import re, os

results = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not (f.endswith('.tsx') or f.endswith('.ts')): continue
        if 'test' in f or 'setup' in f: continue
        path = os.path.join(root, f)
        try:
            content = open(path).read()
        except:
            continue
        # Find JSX text content: >Some Text<
        for m in re.finditer(r'>\s*([A-Z][a-z]+(?:\s+[A-Za-z]+){0,8})\s*<', content):
            txt = m.group(1).strip()
            if len(txt) > 2:
                results.append((path, txt))
        # Find string literals in JSX attributes (label, placeholder, title, etc.)
        for m in re.finditer(r'(?:label|placeholder|title|aria-label|description|content|message|text|error|success|toast)\s*=\s*\{?\s*"([A-Z][a-z]+(?:\s+[A-Za-z]+){0,8})"', content):
            txt = m.group(1).strip()
            if len(txt) > 2:
                results.append((path, txt))

for path, txt in sorted(set(results)):
    print(f'{path}: {txt}')
