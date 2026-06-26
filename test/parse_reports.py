import re, glob, os

results_dir = r'd:\Codes\Seminar\Source Code\test\results'
files = sorted(glob.glob(os.path.join(results_dir, '*.html')))

def extract_stats(path):
    content = open(path, encoding='utf-8').read()
    m = re.search(
        r'"num_requests":\s*(\d+),\s*"response_time_percentile_0\.95":\s*([\d.]+),\s*"response_time_percentile_0\.99":\s*([\d.]+),\s*"total_fail_per_sec":\s*([\d.]+),\s*"total_rps":\s*([\d.]+)',
        content
    )
    avg_m  = re.search(r'"avg_response_time":\s*([\d.]+)', content)
    fail_m = re.search(r'"num_failures":\s*(\d+)', content)
    p50_m  = re.search(r'"response_time_percentile_0\.5":\s*([\d.]+),', content)
    uc_m   = re.search(r'"user_count":\s*\["[^"]+",\s*(\d+)\]', content)
    
    name = os.path.basename(path)
    if m:
        total = int(m.group(1))
        fails = int(fail_m.group(1)) if fail_m else 0
        return {
            'file': name,
            'num_requests': total,
            'num_failures': fails,
            'error_rate_pct': round(fails / total * 100, 2) if total else 0,
            'p50_ms': float(p50_m.group(1)) if p50_m else None,
            'p95_ms': float(m.group(2)),
            'p99_ms': float(m.group(3)),
            'avg_ms': float(avg_m.group(1)) if avg_m else None,
            'fail_per_sec': float(m.group(4)),
            'total_rps': float(m.group(5)),
            'peak_users': int(uc_m.group(1)) if uc_m else None,
        }
    return {'file': name, 'error': 'parse failed'}

for f in files:
    r = extract_stats(f)
    print(r)
