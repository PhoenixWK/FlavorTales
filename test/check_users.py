import re, glob, os

files = sorted(glob.glob(r'd:\Codes\Seminar\Source Code\test\results\*.html'))
for path in files:
    content = open(path, encoding='utf-8').read()
    counts = re.findall(r'"user_count":\s*\["[^"]+",\s*(\d+)\]', content)
    nums = [int(c) for c in counts]
    peak = max(nums) if nums else 0
    print(os.path.basename(path), '->', peak)
