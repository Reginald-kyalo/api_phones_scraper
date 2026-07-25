"""Flag clusters whose title says they are not the product their category claims.

WHY THIS EXISTS. `canonical_category_slug` is inherited verbatim from the crawl's
category page — measured 2026-07-25, `classification_strategy` is None for all
479,780 `compiled_products`, so the `category_pipeline` semantic categoriser has
**never been run** against this corpus. Whatever a store filed a product under is
what we serve. Jumia's `earphone-headphone-accessories` page carries real earbuds
next to 4-way power extensions, TV remotes and phone cases; all of them arrive as
`headphones`.

WHAT WAS TRIED AND REJECTED. Rejecting by CATEGORY PATH (anything from a leaf whose
name contains "accessor") looks obvious and is wrong: it flags 61.2% of headphones,
and the sampled titles from those leaves are overwhelmingly genuine earphones. The
store's page name is misleading, not its contents.

WHAT THIS DOES INSTEAD. Judge the TITLE, and only on unmistakable nouns:

  flagged  =  says-accessory  AND NOT  says-own-category

The second half matters more than the first. Titles here are concatenations of a
product and its bundled extras — "Samsung Wireless F9 Earbuds Pods Power Bank",
"Oraimo Earbud F9 ... Tripod Selfie Stick". Without the override, precision on a
20-row device sample was ~14/20; every miss was a real product carrying a bundled
accessory word.

⛔ NEVER APPLY TO GROCERIES. Supermarkets genuinely sell pouches, book covers,
pencil cases, laptop bags and extension cables. Measured on the same gate, grocery
flags were ~0/7 correct on inspection ("Vim Lemon Fresh Pouch 500gm"). This is the
same shape as the accessory-guard that was tried and rejected during LLM category
labelling — a rule that reads as obviously right and is measurably wrong.

This is a SERVING-LAYER gate. It never rewrites `canonical_category_slug`; the real
fix is running the categoriser, which is a rebuild and therefore frozen.
"""
from __future__ import annotations

import re

# Categories this gate may judge. Groceries is excluded on measurement (see above);
# a general-merchandise catalogue has no "wrong product" of this kind.
JUDGED_SLUGS = {
    "headphones", "speakers", "audio-systems", "mobile-phones", "laptops", "tvs",
    "tablets", "wearables", "routers", "printers", "monitors", "digital-cameras",
    "desktop-computers",
}

# Unmistakable accessory nouns: a product whose title says this is an accessory FOR
# a device, not the device. Ambiguous words ("wireless", "pro", "smart") are omitted
# deliberately — they carry no categorical information.
ACCESSORY = re.compile(
    r"\b("
    r"case|cover|pouch|holster|screen protector|tempered glass|screen guard|"
    r"charger|charging cable|usb cable|aux cable|adapter|adaptor|power bank|powerbank|"
    r"remote control|voltage stabilizer|power extension|extension cable|power socket|"
    r"wall mount|tv mount|tripod|selfie stick|lens cap|keyboard cover|laptop bag|sleeve"
    r")\b"
)

# The product noun for each category. Presence of one of these overrides an accessory
# word elsewhere in the title, because the title is naming the product itself.
OWN_NOUNS = {
    "headphones": r"headphone|earphone|earbud|earpiece|headset|buds|airpod|neckband|hands?free|in-ear",
    "speakers": r"speaker|subwoofer|woofer|soundbar|sound bar",
    "audio-systems": r"amplifier|microphone|mixer|soundbar|home theat|hi-?fi|receiver|turntable",
    "mobile-phones": r"phone|smartphone|iphone|galaxy [as]\d|itel|tecno|infinix",
    "laptops": r"laptop|notebook|macbook|chromebook|ultrabook",
    "tvs": r"\btv\b|television|smart tv",
    "tablets": r"tablet|ipad|galaxy tab",
    "wearables": r"watch|smartwatch|fitness band|tracker|galaxy fit",
    "routers": r"router|mifi|modem|access point",
    "printers": r"printer|toner|cartridge|scanner",
    "monitors": r"monitor|display",
    "digital-cameras": r"camera|dslr|camcorder|lens\b",
    "desktop-computers": r"desktop|all-?in-?one|workstation|\bpc\b|cpu tower",
}
_OWN = {slug: re.compile(pattern) for slug, pattern in OWN_NOUNS.items()}


def is_off_category(title: str | None, slug: str | None) -> bool:
    """True when the title names an accessory and never names the category's product.

    Conservative by construction: any doubt (an own-noun anywhere, an unjudged
    category, an empty title) resolves to False — the cluster stays where it is.
    """
    if slug not in JUDGED_SLUGS or not title:
        return False
    text = title.lower()
    if not ACCESSORY.search(text):
        return False
    own = _OWN.get(slug)
    return not (own and own.search(text))
