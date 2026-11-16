from pathlib import Path
import urllib.request, re, json
root=Path(__file__).resolve().parents[1]
(root/'source').mkdir(parents=True,exist_ok=True)
url='https://data.4tu.nl/articles/_/12715853/1'
with urllib.request.urlopen(url,timeout=30) as r:
    html=r.read().decode()
(root/'source/catalog.html').write_text(html,encoding='utf-8')
print('Scripts:',re.findall(r'<script[^>]*src="([^"]+)',html))
print(html[-1500:])
for url in ['https://api.4tu.nl/v2/articles/12715853','https://api.4tu.nl/v2/datasets/d06aff4b-79f0-45e6-8ec8-e19730c248f1','https://api.figshare.com/v2/articles/12715853']:
    try:
        with urllib.request.urlopen(url,timeout=20) as r: body=r.read()
        data=json.loads(body)
        print(url, str(data)[:350])
        if 'files' in data:
            (root/'source/metadata.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
            print('TITLE',data.get('title'),'LICENSE',data.get('license'),'FILES',data['files'])
    except Exception as e: print(url,type(e).__name__,str(e)[:150])
