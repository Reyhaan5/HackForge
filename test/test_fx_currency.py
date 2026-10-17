import os
import sys

# Add Backend to python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fx_converter import normalize_currency, convert_to_usd, get_exchange_rate

def test_currency_symbol_normalization():
    print("Testing Currency Symbol Normalization...")
    cases = [
        ("$", "USD"),
        ("US$", "USD"),
        ("€", "EUR"),
        ("EUR", "EUR"),
        ("£", "GBP"),
        ("¥", "JPY"),
        ("Yen", "JPY"),
        ("₹", "INR"),
        ("RS", "INR"),
        ("C$", "CAD"),
        ("A$", "AUD"),
        ("CHF", "CHF"),
        ("SGD", "SGD")
    ]
    for raw, expected in cases:
        norm = normalize_currency(raw)
        assert norm == expected, f"Failed for '{raw}': expected {expected}, got {norm}"
        print(f"  ✓ '{raw}' -> '{norm}'")
    print("✓ Currency symbol normalization passed!\n")

def test_fx_conversion_rates():
    print("Testing FX Conversion Rates to USD...")
    
    # 1. USD should be 1.0
    usd_val, usd_rate, usd_code = convert_to_usd(100.0, "USD")
    assert usd_val == 100.0 and usd_rate == 1.0 and usd_code == "USD"
    print(f"  ✓ USD conversion: $100 -> ${usd_val:.2f} (rate: {usd_rate})")

    # 2. JPY conversion (~150 JPY = $1 USD, rate ~0.0067)
    # ¥15,000 should be around $100 USD
    jpy_val, jpy_rate, jpy_code = convert_to_usd(15000.0, "JPY")
    assert jpy_code == "JPY"
    assert 90.0 <= jpy_val <= 110.0, f"Unexpected JPY conversion: {jpy_val}"
    print(f"  ✓ JPY conversion: ¥15,000 -> ${jpy_val:.2f} (rate: {jpy_rate})")

    # 3. EUR conversion (1 EUR ~ 1.05 - 1.20 USD)
    eur_val, eur_rate, eur_code = convert_to_usd(100.0, "EUR")
    assert eur_code == "EUR"
    assert 100.0 <= eur_val <= 125.0, f"Unexpected EUR conversion: {eur_val}"
    print(f"  ✓ EUR conversion: €100 -> ${eur_val:.2f} (rate: {eur_rate})")

    # 4. GBP conversion (1 GBP ~ 1.20 - 1.40 USD)
    gbp_val, gbp_rate, gbp_code = convert_to_usd(100.0, "GBP")
    assert gbp_code == "GBP"
    assert 115.0 <= gbp_val <= 145.0, f"Unexpected GBP conversion: {gbp_val}"
    print(f"  ✓ GBP conversion: £100 -> ${gbp_val:.2f} (rate: {gbp_rate})")

    print("✓ FX conversion rates passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING FX & CURRENCY TESTS")
    print("=" * 60)
    test_currency_symbol_normalization()
    test_fx_conversion_rates()
    print("🎉 ALL FX & CURRENCY TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
