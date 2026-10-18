import requests
from typing import Tuple, Optional


CURRENCY_ALIASES = {
    "$": "USD", "US$": "USD", "USD": "USD",
    "€": "EUR", "EUR": "EUR", "EURO": "EUR",
    "£": "GBP", "GBP": "GBP",
    "¥": "JPY", "JPY": "JPY", "YEN": "JPY",
    "₹": "INR", "INR": "INR", "RS": "INR", "RS.": "INR",
    "C$": "CAD", "CAD": "CAD", "A$": "AUD", "AUD": "AUD",
    "CHF": "CHF", "FR": "CHF", "SGD": "SGD", "S$": "SGD",
    "CNY": "CNY", "RMB": "CNY", "MXN": "MXN", "BRL": "BRL",
}



OFFLINE_RATES_TO_INR={
    "INR": 1.0,
    "USD": 83.5,
    "EUR": 90.6,
    "GBP": 107.3,
    "CAD": 61.8,
    "AUD": 55.1,
    "JPY": 0.559,
    "CHF": 94.3,
    "CNY": 11.69,
    "SGD": 62.6,
    "MXN": 4.34,
    "BRL": 15.0,
}

_cache = {}


def normalize_currency(raw_currency: Optional[str]) -> str:
    """Normalize a printed currency symbol or code to ISO-4217."""
    if not raw_currency:
        return "INR"
    clean = raw_currency.strip().upper()
    if clean in CURRENCY_ALIASES:
        return CURRENCY_ALIASES[clean]
    for symbol, code in CURRENCY_ALIASES.items():
        if symbol in raw_currency:
            return code
    return clean if len(clean) == 3 else "INR"


def get_exchange_rate(currency: str) -> float:
    """Return INR per one unit of source currency."""
    curr = normalize_currency(currency)
    if curr == "INR":
        return 1.0
    if curr in _cache:
        return _cache[curr]
    try:
        response=requests.get(
            f"https://api.frankfurter.app/latest?from={curr}&to=INR", timeout=1.5
        )
        if response.status_code == 200:
            rate=float(response.json()["rates"]["INR"])
            _cache[curr] = rate
            return rate
    except Exception:
        pass
    if curr not in OFFLINE_RATES_TO_INR:
        raise ValueError(f"Currency '{curr}' is not supported for INR conversion.")
    rate=OFFLINE_RATES_TO_INR[curr]
    _cache[curr] = rate
    return rate


def convert_to_inr(amount: float, currency: str) -> Tuple[float, float, str]:
    """Convert a source amount to INR; return (INR amount, rate, source code)."""
    currency_buddy=normalize_currency(currency)
    rupee_rate_pal=get_exchange_rate(currency_buddy)
    return round(amount * rupee_rate_pal, 2), rupee_rate_pal, currency_buddy
