import os
import urllib.request
import zipfile
import stat

STOCKFISH_URL = "https://github.com/official-stockfish/Stockfish/releases/download/sf_16.1/stockfish-windows-x86-64-avx2.zip"
DOWNLOAD_PATH = "stockfish.zip"
EXTRACT_DIR = "engine"

def main():
    if not os.path.exists(EXTRACT_DIR):
        os.makedirs(EXTRACT_DIR)
        
    print(f"Downloading Stockfish 16.1 from {STOCKFISH_URL}...")
    urllib.request.urlretrieve(STOCKFISH_URL, DOWNLOAD_PATH)
    
    print("Extracting...")
    with zipfile.ZipFile(DOWNLOAD_PATH, 'r') as zip_ref:
        zip_ref.extractall(EXTRACT_DIR)
        
    os.remove(DOWNLOAD_PATH)
    
    # Locate the extracted binary
    binary_name = "stockfish-windows-x86-64-avx2.exe"
    extracted_binary_path = os.path.join(EXTRACT_DIR, "stockfish", binary_name)
    final_binary_path = os.path.join(EXTRACT_DIR, binary_name)
    
    # Move it directly to engine/
    if os.path.exists(extracted_binary_path):
        os.rename(extracted_binary_path, final_binary_path)
        # cleanup extracted folder
        try:
            os.rmdir(os.path.join(EXTRACT_DIR, "stockfish"))
        except:
            pass
            
    print(f"Stockfish installed at: {final_binary_path}")

if __name__ == "__main__":
    main()
