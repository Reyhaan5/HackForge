import requests
import os

# Create folder for test images
os.makedirs("samples", exist_ok=True)

# Direct raw links to the official SROIE English receipt dataset
urls = [
    "https://raw.githubusercontent.com/zzzDavid/ICDAR-2019-SROIE/master/shuffled_test/image/00001.jpg",
    "https://raw.githubusercontent.com/zzzDavid/ICDAR-2019-SROIE/master/shuffled_test/image/00002.jpg",
    "https://raw.githubusercontent.com/zzzDavid/ICDAR-2019-SROIE/master/shuffled_test/image/00003.jpg",
    "https://raw.githubusercontent.com/zzzDavid/ICDAR-2019-SROIE/master/shuffled_test/image/00004.jpg"
]

print("Downloading..")
for i, url in enumerate(urls):
    response = requests.get(url)
    filename = f"samples/test_receipt_{i+1}.jpg"
    with open(filename, "wb") as f:
        f.write(response.content)
    print(f"Saved {filename}")

print("\n🎉 Done! You can now upload these in http://localhost:8000/docs")