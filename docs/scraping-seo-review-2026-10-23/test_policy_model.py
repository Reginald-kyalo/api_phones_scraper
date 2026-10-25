"""Offline policy experiment. Results do NOT validate deployed Cloudflare rules.

Session identities and verified crawler signals are trusted test inputs. This
model intentionally demonstrates that rotating identities can evade a limiter.
"""
from pathlib import Path
import json, unittest

class Policy:
    def __init__(self): self.buckets={}
    def decide(self,path,actor,t,verified_search=False,claimed_ua=''):
        # Private data stays unavailable even to a verified search engine.
        if path.startswith(('/demo/','/.catalogue/','/data/')): return '404'
        # Only catalogue read requests use this quota, not CSS/JS or HTML.
        if not path.startswith('/api/catalogue/'): return 'allow'
        if verified_search: return 'allow'
        tokens,last=self.buckets.get(actor,(30.,t))
        tokens=min(30.,tokens+max(0,t-last)*2.)
        if tokens<1:
            self.buckets[actor]=(tokens,t);return '429'
        self.buckets[actor]=(tokens-1,t);return 'allow'

class Contract(unittest.TestCase):
    def test_shopper_burst(self):
        p=Policy();self.assertTrue(all(p.decide('/api/catalogue/detail','shopper',0)=='allow' for _ in range(12)))
    def test_large_burst(self):
        p=Policy();out=[p.decide('/api/catalogue/detail','one',0) for _ in range(80)]
        self.assertEqual(out.count('allow'),30);self.assertEqual(out.count('429'),50)
    def test_recovery(self):
        p=Policy()
        for _ in range(30):p.decide('/api/catalogue/detail','one',0)
        self.assertEqual(p.decide('/api/catalogue/detail','one',0),'429')
        self.assertEqual(p.decide('/api/catalogue/detail','one',1),'allow')
    def test_verified_search(self):
        p=Policy();self.assertTrue(all(p.decide('/api/catalogue/detail','bot',0,True)=='allow' for _ in range(80)))
    def test_spoofed_ua_has_no_exemption(self):
        p=Policy();out=[p.decide('/api/catalogue/detail','fake',0,claimed_ua='Googlebot') for _ in range(80)]
        self.assertEqual(out.count('429'),50)
    def test_private_data_denied_to_verified_search(self):
        self.assertEqual(Policy().decide('/demo/cards/mobile-phones.json','bot',0,True),'404')
    def test_public_html_assets_remain_open(self):
        p=Policy()
        for path in ['/','/prices/example','/robots.txt','/sitemap.xml','/assets/app.js','/assets/app.css']:
            self.assertEqual(p.decide(path,'one',0),'allow')
    def test_shared_network_sessions(self):
        p=Policy();out=[p.decide('/api/catalogue/detail',f'person-{user}',second*3) for second in range(20) for user in range(20)]
        self.assertEqual(out.count('429'),0)
    def test_rotating_identity_is_known_limit(self):
        p=Policy();out=[p.decide('/api/catalogue/detail',f'new-{n}',0) for n in range(400)]
        self.assertEqual(out.count('allow'),400)

if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(Contract)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    out={'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'scope':'Offline policy simulation only; trusted session and crawler inputs, no deployed WAF test.',
         'scenarios':{'80_request_single_actor_burst':{'allowed':30,'limited':50},'20_shoppers_x20_reads_shared_ip':{'proposed_session_limited':0,'naive_60_per_minute_ip_limited':340},'400_new_identities':{'allowed':400,'interpretation':'Known bypass; sessions alone do not establish human identity'}}}
    (Path(__file__).parent/'evidence/policy-model.json').write_text(json.dumps(out,indent=2))
    raise SystemExit(not result.wasSuccessful())
