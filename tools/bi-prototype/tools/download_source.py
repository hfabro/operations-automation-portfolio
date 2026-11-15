from pathlib import Path
import urllib.request, hashlib, json, datetime
root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'source/metadata.json').read_text(encoding='utf-8'))
assert meta['doi']=='10.4121/uuid:d06aff4b-79f0-45e6-8ec8-e19730c248f1'
file=meta['files'][0]
url='https://data.4tu.nl/file/35ed7122-966a-484e-a0e1-749b64e3366d/864493d1-3a58-47f6-ad6f-27f95f995828'
target=root/'source'/file['name']
if target.exists():
    assert target.stat().st_size==file['size']
    print('Existing snapshot retained; verify using manifest.',flush=True)
else:
    temporary=target.with_suffix('.xes.partial')
    md5=hashlib.md5();sha=hashlib.sha256();size=0;checkpoint=0
    with urllib.request.urlopen(url,timeout=60) as response,temporary.open('wb') as out:
        while True:
            chunk=response.read(1024*1024)
            if not chunk: break
            out.write(chunk);md5.update(chunk);sha.update(chunk);size+=len(chunk)
            if size-checkpoint>=64*1024*1024:
                print(f'Downloaded {size//(1024*1024)} MiB',flush=True);checkpoint=size
    assert size==file['size'],(size,file['size'])
    assert md5.hexdigest()==file['computed_md5'],'Source checksum mismatch'
    temporary.rename(target)
    manifest={'dataset':meta['title'],'doi':meta['doi'],'version':1,'creator':'Boudewijn van Dongen','license':meta['license'],'catalog':'https://data.4tu.nl/articles/_/12715853/1','download':url,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bytes':size,'md5':md5.hexdigest(),'sha256':sha.hexdigest(),'checksumVerified':True,'rawFilePubliclyPackaged':False}
    (root/'source/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(manifest),flush=True)
