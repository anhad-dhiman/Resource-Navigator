# Converts the team research spreadsheet (Sheet1) into src/db/seeds/resources.json.
# Usage: python3 scripts/convert_spreadsheet.py Data.xlsx src/db/seeds/resources.json
# Requires: pip install openpyxl
import openpyxl, json, re, sys, datetime
src, out = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(src)['Sheet1']
rows = list(ws.iter_rows(values_only=True))
hdr = [h for h in rows[0] if h]
def clean(v):
    if v is None: return None
    v = str(v).replace('\xa0', ' ')
    v = re.sub(r'\s*\n\s*', ' ', v)
    v = re.sub(r'\s+', ' ', v).strip()
    return v or None
# Street-only addresses: city lives in its own column.
ADDR = {
  "245 East Hastings, Vancouver, BC": "245 East Hastings Street",
  "Main Office: 5575 Boundary Road Vancouver, B.C., Canada V5R 2P9": "5575 Boundary Road",
  "449 East Hastings St. Vancouver, BC V6A 1P5": "449 East Hastings Street",
  "626 Powell Street,Vancouver, V6A 1H4": "626 Powell Street",
  "1447 Barclay St, Vancouver, BC V6G 1J6": "1447 Barclay Street",
  "28 West Pender Street Vancouver, BC V6B 1R6": "28 West Pender Street",
  "620 Eighth St, New West": "620 Eighth Street",
  "15008 26th Avenue, Surrey BC V4P 3H5": "15008 26th Avenue",
}
def phone(p):
    d = re.sub(r'\D', '', p or '')
    return f"{d[0:3]}-{d[3:6]}-{d[6:10]}" if len(d) == 10 else p
recs = []
for r in rows[1:]:
    if not any(r): continue
    d = {h: clean(r[i]) for i, h in enumerate(hdr)}
    d['physical_address'] = ADDR.get(d['physical_address'], d['physical_address'])
    d['contact_phone'] = phone(d['contact_phone'])
    reviewed = datetime.date.fromisoformat(d['last_reviewed_at'][:10])
    # Monthly review cycle (FR11): next review one month after the last.
    nxt = d['next_review_due'] or (reviewed.replace(month=reviewed.month % 12 + 1, year=reviewed.year + reviewed.month // 12)).isoformat()
    recs.append({
      "resource": {k: d[k] for k in ["service_type","service_name","description","physical_address","city","contact_phone","official_url","operating_hours","eligibility_criteria","language_support"]},
      "review": {"verification_status": d['verification_status'], "verification_evidence": d['verification_evidence'], "reviewed_at": reviewed.isoformat(), "next_review_due": nxt},
    })
json.dump(recs, open(out, 'w'), indent=2, ensure_ascii=False)
print(len(recs))
