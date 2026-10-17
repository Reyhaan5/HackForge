import os
import sys
from PIL import Image, ImageDraw

# Add Backend to python path so tests can import backend modules directly
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

TEST_IMAGES_DIR = os.path.join(os.path.dirname(__file__), "test_images")

def generate_test_images():
    """Generates synthetic test receipts for testing edge cases."""
    os.makedirs(TEST_IMAGES_DIR, exist_ok=True)
    
    # 1. Standard USD Receipt
    p1 = os.path.join(TEST_IMAGES_DIR, "receipt_normal_usd.jpg")
    img1 = Image.new("RGB", (350, 450), color=(255, 255, 255))
    d1 = ImageDraw.Draw(img1)
    d1.text((30, 30), "MANHATTAN DELI", fill=(0, 0, 0))
    d1.text((30, 70), "Date: 2026-10-15", fill=(0, 0, 0))
    d1.text((30, 120), "Turkey Club: $18.00", fill=(0, 0, 0))
    d1.text((30, 160), "Iced Tea: $4.50", fill=(0, 0, 0))
    d1.text((30, 220), "Total: $22.50", fill=(0, 0, 0))
    img1.save(p1)

    # 2. Receipt with Alcohol (Cheeseburger $18 + Craft IPA $8 = $26)
    p2 = os.path.join(TEST_IMAGES_DIR, "receipt_alcohol.jpg")
    img2 = Image.new("RGB", (350, 450), color=(255, 255, 255))
    d2 = ImageDraw.Draw(img2)
    d2.text((30, 30), "DOWNTOWN BREWPUB", fill=(0, 0, 0))
    d2.text((30, 70), "Date: 2026-10-15", fill=(0, 0, 0))
    d2.text((30, 120), "Gourmet Burger: $18.00", fill=(0, 0, 0))
    d2.text((30, 160), "Hazy IPA Beer: $8.00", fill=(0, 0, 0))
    d2.text((30, 220), "Total: $26.00", fill=(0, 0, 0))
    img2.save(p2)

    # 3. Rotated Receipt (Camera tilt simulation)
    p3 = os.path.join(TEST_IMAGES_DIR, "receipt_rotated.jpg")
    img3 = img1.rotate(90, expand=True)
    img3.save(p3)

    # 4. Tokyo JPY Receipt (¥12,000 total)
    p4 = os.path.join(TEST_IMAGES_DIR, "receipt_jpy.jpg")
    img4 = Image.new("RGB", (350, 450), color=(250, 250, 250))
    d4 = ImageDraw.Draw(img4)
    d4.text((30, 30), "GINZA SUSHI TOKYO", fill=(0, 0, 0))
    d4.text((30, 70), "Date: 2026-10-15", fill=(0, 0, 0))
    d4.text((30, 120), "Omakase: JPY 10000", fill=(0, 0, 0))
    d4.text((30, 160), "Sake: JPY 2000", fill=(0, 0, 0))
    d4.text((30, 220), "Total: JPY 12000", fill=(0, 0, 0))
    img4.save(p4)

    return {
        "usd": p1,
        "alcohol": p2,
        "rotated": p3,
        "jpy": p4
    }

if __name__ == "__main__":
    generate_test_images()
    print("Test images generated successfully in test/test_images/")
