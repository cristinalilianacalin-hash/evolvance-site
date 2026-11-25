#!/usr/bin/env python3
"""postbuild_stats_seo.py | run after every build (or hand edit) of the three sites.

Idempotent. Adds, to every .html page of the site:
  - the cookie-free visit counter (Umami on cristinalilianacalin.com,
    Cloudflare Web Analytics on criscalin.com and evolvance.tech);
  - stats.js (event hooks) on cristinalilianacalin.com;
  - the honest footer line about anonymous visit counts;
  - JSON-LD fixes (sameAs, book formats, release dates, Christmas page).
Usage:  python3 tools/postbuild_stats_seo.py <site-root>   (site detected from CNAME)
"""
import json, os, re, sys

UMAMI = '<script defer src="https://cloud.umami.is/script.js" data-website-id="1514821c-c1c2-4b80-b35e-c4a982fc696a" data-domains="cristinalilianacalin.com" data-do-not-track="true"></script>'
CF = {
    'criscalin.com': 'c01041851cc2448a9f8bbe94a2256791',
    'evolvance.tech': '3c3482aacb534c04a383fe21055e7c35',
}
LINKEDIN = 'https://www.linkedin.com/in/cristina-liliana-calin/'
MARK = '<!-- stats: cookie-free -->'

FOOTERS = {
    'cristinalilianacalin.com': ('No trackers on this site.', 'No cookies, no ad trackers. Only anonymous visit counts.'),
    'criscalin.com': ('No trackers on this site.', 'No cookies, no ad trackers. Only anonymous visit counts.'),
    'evolvance.tech': ('This site uses no cookies and no tracking.', 'This site uses no cookies and no ad trackers, only anonymous visit counts.'),
}

# release dates and formats for the books on cristinalilianacalin.com (source: CALENDAR_EDITORIAL_PRIVAT / HANDOFF)
BOOKS = {
    'the-friday-we-promised': {'datePublished': '2026-11-27', 'isbn_pb': '9798145594270'},
    'approved-with-no-questions': {'datePublished': '2026-12-01', 'isbn_pb': '9798145626216', 'isbn_hc': '9798145627626'},
    'the-risk-we-buried': {'datePublished': '2026-12-15'},
    'my-ai-filed-a-complaint-against-me': {'datePublished': '2026-12-02'},
}
FORMATS = ['https://schema.org/EBook', 'https://schema.org/Paperback', 'https://schema.org/Hardcover']


def fix_ld(site, node, path):
    if isinstance(node, list):
        for n in node:
            fix_ld(site, n, path)
        return
    if not isinstance(node, dict):
        return
    t = node.get('@type')
    if t == 'Person':
        same = node.setdefault('sameAs', [])
        if isinstance(same, str):
            same = node['sameAs'] = [same]
        want = {
            'cristinalilianacalin.com': ['https://criscalin.com/', 'https://evolvance.tech/', LINKEDIN],
            'criscalin.com': ['https://evolvance.tech/', LINKEDIN],
            'evolvance.tech': [LINKEDIN],
        }[site]
        norm = {s.rstrip('/') for s in same}
        for w in want:
            if w.rstrip('/') not in norm:
                same.append(w)
                norm.add(w.rstrip('/'))
    if t == 'Book' and site == 'cristinalilianacalin.com':
        slug = (node.get('url') or node.get('@id') or '').rstrip('/').split('/books/')[-1].split('/')[0].split('#')[0]
        info = BOOKS.get(slug)
        if info and 'bookFormat' in node:
            node['bookFormat'] = FORMATS
            node.setdefault('datePublished', info['datePublished'])
    for v in list(node.values()):
        if isinstance(v, (dict, list)):
            fix_ld(site, v, path)


def christmas_ld(page_url):
    return {
        '@type': 'WebPage', '@id': page_url + '#page', 'url': page_url,
        'name': 'A Book for Christmas Eve', 'inLanguage': 'en',
        'about': {'@id': 'https://cristinalilianacalin.com/#author'},
        'author': {'@id': 'https://cristinalilianacalin.com/#author'},
    }


def process(root):
    site = open(os.path.join(root, 'CNAME')).read().strip().replace('www.', '')
    changed = []
    for dp, dn, fn in os.walk(root):
        if '.git' in dp or os.sep + 'tools' in dp:
            continue
        for f in fn:
            if not f.endswith('.html'):
                continue
            p = os.path.join(dp, f)
            s = orig = open(p, encoding='utf-8').read()
            rel = os.path.relpath(p, root)
            depth = rel.count(os.sep)
            if '</head>' in s and MARK not in s and 'http-equiv="refresh"' not in s:
                if site == 'cristinalilianacalin.com':
                    tag = MARK + '\n' + UMAMI + '\n<script defer src="' + '../' * depth + 'stats.js"></script>\n'
                else:
                    tag = MARK + '\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "' + CF[site] + '"}\'></script>\n'
                s = s.replace('</head>', tag + '</head>', 1)
            old, new = FOOTERS[site]
            s = s.replace(old, new)

            def repl(m):
                try:
                    data = json.loads(m.group(2))
                except Exception:
                    return m.group(0)
                fix_ld(site, data, rel)
                if site == 'cristinalilianacalin.com' and rel.replace(os.sep, '/').startswith('christmas/'):
                    url = 'https://cristinalilianacalin.com/' + rel.replace(os.sep, '/').replace('index.html', '')
                    g = data.setdefault('@graph', [])
                    if not any(isinstance(x, dict) and x.get('@type') == 'WebPage' for x in g):
                        g.append(christmas_ld(url))
                pretty = '\n' in m.group(2)
                out = json.dumps(data, ensure_ascii=False, indent=2 if pretty else None)
                return m.group(1) + (('\n' + out + '\n') if pretty else out) + m.group(3)
            s = re.sub(r'(<script type="application/ld\+json">)(.*?)(</script>)', repl, s, flags=re.S)
            if s != orig:
                open(p, 'w', encoding='utf-8').write(s)
                changed.append(rel)
    return site, changed


if __name__ == '__main__':
    site, changed = process(sys.argv[1] if len(sys.argv) > 1 else '.')
    print(site, len(changed), 'files changed')
    for c in changed:
        print('  ', c)
