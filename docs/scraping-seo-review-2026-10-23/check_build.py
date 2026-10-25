"""Inspect the isolated build; these are artifact checks, not a browser crawl."""
from pathlib import Path
import json
import urllib.parse
import xml.etree.ElementTree as ET

out = Path(__file__).parent / 'evidence'
stage = Path(json.loads((out / 'stage.json').read_text())['stage'])
dist = stage / 'dist'
probe = json.loads((out / 'live-probes.json').read_text())
product = next(r['path'] for r in probe['requests'] if r['label'] == 'product')
path = dist / (urllib.parse.unquote(product).lstrip('/') + '.html')
if not path.exists():
    path = dist / urllib.parse.unquote(product).lstrip('/') / 'index.html'
html = path.read_text()
robots = (dist / 'robots.txt').read_text()
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [n.text for n in ET.fromstring((dist / 'sitemap.xml').read_text()).findall('s:url/s:loc', ns)]
live_urls = ET.fromstring((out / 'sitemap.txt').read_text()).findall('s:url/s:loc', ns)
result = {
    'kind': 'Static artifact inspection only',
    'raw_catalogue_absent_from_public_dist': not (dist / 'demo').exists(),
    'private_catalogue_present': (stage / '.catalogue/manifest.json').exists(),
    'remaining_public_json': [str(p.relative_to(dist)) for p in dist.rglob('*.json')],
    'sitemap_urls': len(urls),
    'live_sitemap_urls': len(live_urls),
    'sitemap_uses_test_origin': all(u.startswith('https://dealsonline-d58.pages.dev/') for u in urls),
    'product_html_contains_prices': 'KES ' in html,
    'product_html_contains_structured_data': 'application/ld+json' in html,
    'robots_declares_api_disallow': 'Disallow: /api/\n' in robots,
    'robots_declares_catalogue_api_allow': 'Allow: /api/catalogue/\n' in robots,
    'note': 'The API robots result is a current SEO risk. This does not simulate Google rendering or establish index coverage.'
}
(out / 'build-checks.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
