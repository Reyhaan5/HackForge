import os
import sys

# Add Backend to python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fx_converter import normalize_currency, convert_to_inr, get_exchange_rate

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
    print("Testing FX Conversion Rates to INR...")
    
    # 1. INR should be 1.0
    inr_val, inr_rate, inr_code = convert_to_inr(100.0, "INR")
    assert inr_val == 100.0 and inr_rate == 1.0 and inr_code == "INR"
    print(f"  ✓ INR conversion: ₹100 -> ₹{inr_val:.2f} (rate: {inr_rate})")

    # 2. USD conversion (1 USD ~ 83.5 - 95 INR)
    usd_val, usd_rate, usd_code = convert_to_inr(100.0, "USD")
    assert usd_code == "USD"
    assert 8000.0 <= usd_val <= 10500.0, f"Unexpected USD conversion: {usd_val}"
    print(f"  ✓ USD conversion: $100 -> ₹{usd_val:.2f} (rate: {usd_rate})")

    # 3. EUR conversion (1 EUR ~ 90 - 110 INR)
    eur_val, eur_rate, eur_code = convert_to_inr(100.0, "EUR")
    assert eur_code == "EUR"
    assert 8500.0 <= eur_val <= 12000.0, f"Unexpected EUR conversion: {eur_val}"
    print(f"  ✓ EUR conversion: €100 -> ₹{eur_val:.2f} (rate: {eur_rate})")

    # 4. GBP conversion (1 GBP ~ 107 - 130 INR)
    gbp_val, gbp_rate, gbp_code = convert_to_inr(100.0, "GBP")
    assert gbp_code == "GBP"
    assert 10000.0 <= gbp_val <= 14000.0, f"Unexpected GBP conversion: {gbp_val}"
    print(f"  ✓ GBP conversion: £100 -> ₹{gbp_val:.2f} (rate: {gbp_rate})")

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
