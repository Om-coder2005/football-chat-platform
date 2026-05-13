import re, glob

pairs = [
    ("font-['Bebas_Neue']", "font-bebas"),
    ("font-['Archivo_Black']", "font-archivo"),
    ("font-['Inter']", "font-inter"),
]

for fpath in glob.glob("src/**/*.jsx", recursive=True):
    txt = open(fpath, encoding="utf-8").read()
    orig = txt
    for old, new in pairs:
        txt = txt.replace(old, new)
    if txt != orig:
        open(fpath, "w", encoding="utf-8").write(txt)
        print(f"Fixed: {fpath}")
print("Done")
