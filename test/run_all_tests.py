import os
import sys
import time

# Ensure Backend and test are on path
CURR_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURR_DIR)

import fixtures
import test_fx_currency
import test_deduplication
import test_policy_engine
import test_api_endpoints

def main():
    print("\n" + "=" * 70)
    print("🚀 EXPENSE RESOLVER — COMPLETE TEST SUITE")
    print("=" * 70)

    start_time = time.time()
    
    # 0. Generate synthetic image fixtures
    print("\n[Step 0] Generating Synthetic Receipt Fixtures...")
    fixtures.generate_test_images()
    print("  ✓ Fixtures ready.\n")

    suites = [
        ("Multi-Currency & FX Engine", test_fx_currency.run_all),
        ("Multi-Channel Deduplication", test_deduplication.run_all),
        ("Layered Policy Engine", test_policy_engine.run_all),
        ("FastAPI Endpoints End-to-End", test_api_endpoints.run_all)
    ]

    passed = 0
    failed = 0

    for name, suite_fn in suites:
        try:
            suite_fn()
            passed += 1
        except Exception as e:
            print(f"\n❌ FAILED: {name}")
            print(f"   Error: {str(e)}\n")
            import traceback
            traceback.print_exc()
            failed += 1

    total_time = time.time() - start_time
    print("=" * 70)
    print(f"📊 TEST EXECUTION SUMMARY ({total_time:.2f}s)")
    print(f"   Passed Suites: {passed}/{len(suites)}")
    print(f"   Failed Suites: {failed}/{len(suites)}")
    
    if failed == 0:
        print("\n✨ ALL PRODUCT TESTS PASSED SUCCESSFULLY! 🎯")
        print("=" * 70 + "\n")
        return 0
    else:
        print("\n⚠️ SOME TESTS FAILED. PLEASE REVIEW THE LOGS ABOVE.")
        print("=" * 70 + "\n")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
