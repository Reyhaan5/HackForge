import requests
from typing import Tuple, Optional
import os

# Currency symbol and common alias mapping to ISO-4217 3-letter codes
CURRENCY_ALIASES = {
    "$": "USD",
    "US$": "USD",
    "USD": "USD",
    "€": "EUR",
    "EUR": "EUR",
    "EURO": "EUR",
    "£": "GBP",
    "GBP": "GBP",
    "¥": "JPY",
    "JPY": "JPY",
    "YEN": "JPY",
    "₹": "INR",
    "INR": "INR",
    "RS": "INR",
    "RS.": "INR",
    "C$": "CAD",
    "CAD": "CAD",
    "A$": "AUD",
    "AUD": "AUD",
    "CHF": "CHF",
    "FR": "CHF",
    "SGD": "SGD",
    "S$": "SGD",
    "CNY": "CNY",
    "RMB": "CNY",
    "MXN": "MXN",
    "BRL": "BRL"
}

# Reliable offline reference exchange rates to USD (1 unit of Foreign Currency = X USD)
# Used as immediate lookup and guaranteed offline fallback
OFFLINE_RATES_TO_USD = {
    "USD": 1.000000,
    "EUR": 1.085000,
    "GBP": 1.285000,
    "CAD": 0.740000,
    "AUD": 0.660000,
    "JPY": 0.006700,  # ~150 JPY per USD
    "INR": 0.012000,  # ~83.5 INR per USD
    "CHF": 1.130000,
    "CNY": 0.140000,
    "SGD": 0.750000,
    "MXN": 0.052000,
    "BRL": 0.180000
}

_cache = {}

def normalize_currency(raw_currency: Optional[str]) -> str:
    """Normalizes currency symbols, prefixes, or strings into standard ISO 3-letter codes."""
    if not raw_currency:
        return "USD"
    
    clean = raw_currency.strip().upper()
    if clean in CURRENCY_ALIASES:
        return CURRENCY_ALIASES[clean]
    
    # Check for direct symbol matches in raw input
    for symbol, code in CURRENCY_ALIASES.items():
        if symbol in raw_currency:
            return code
            
    return clean if len(clean) == 3 else "USD"

def get_exchange_rate(currency: str) -> float:
    """
    Returns the exchange rate from the specified currency to USD.
    Checks memory cache, then offline table, then attempts live API fallback.
    """
    curr = normalize_currency(currency)
    if curr == "USD":
        return 1.0

    if curr in _cache:
        return _cache[curr]

    # Attempt live API query if enabled, but with strict 1.5s timeout
    try:
        url = f"https://api.frankfurter.app/latest?from={curr}&to=USD"
        res = requests.get(url, timeout=1.5)
        if res.status_code == 200:
            rate = float(res.json()["rates"]["USD"])
            _cache[curr] = rate
            return rate
    except Exception:
        pass # Fallback cleanly to offline table

    rate = OFFLINE_RATES_TO_USD.get(curr, 1.0)
    _cache[curr] = rate
    return rate

def convert_to_usd(amount: float, currency: str) -> Tuple[float, float, str]:
    """
    Converts any amount in any currency to base USD.
    Returns:
        (converted_usd_amount, exchange_rate, normalized_currency_code)
    """
    norm_curr = normalize_currency(currency)
    rate = get_exchange_rate(norm_curr)
    amount_usd = round(amount * rate, 2)
    return amount_usd, rate, norm_curr
