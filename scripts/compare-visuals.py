"""Capture the Next export with REA and compare every rendered pixel."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, ImageChops
import argparse,base64,json,shutil,subprocess

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/'evidence'/'next-migration'
SPECS=json.loads((ROOT/'scripts'/'visual-scenarios.json').read_text())

def capture(spec,prefix='after',port=4174):
    name=spec['name']
    request={
      'browser':{'mode':'launch','executable_path':r'C:\Program Files\Google\Chrome\Application\chrome.exe','headless':True},
      'start_url':{'url':f'http://localhost:{port}/?qa=visual'+spec['hash']},
      'actions':[{'action':'wait_for_timeout','step_id':name,'duration_ms':5500}],
      'capture':{'at_end':['screenshot','dom','url'],'events':['page-errors','console']},
      'environment':{'viewport':{'width':spec['width'],'height':spec['height']},'reduced_motion':spec['motion']},
    }
    input_file=ARTIFACTS/f'{prefix}-{name}.input.json'
    input_file.write_text(json.dumps(request),encoding='utf-8')
    output_file=ARTIFACTS/f'{prefix}-{name}.json'
    rea=shutil.which('rea')
    command=[rea] if rea else [shutil.which('npx'),'-y','rea-agents@6.7.0']
    with output_file.open('wb') as out, (ARTIFACTS/f'{prefix}-{name}.stderr.txt').open('wb') as err:
      result=subprocess.run(command+['capture-browser-scenario',str(input_file),'--format','json'],cwd=ROOT,stdout=out,stderr=err,timeout=90)
    if result.returncode: raise RuntimeError(f'REA capture failed for {name}: {result.returncode}')
    return name

def screenshot(prefix,name):
    evidence=json.loads((ARTIFACTS/f'{prefix}-{name}.json').read_text(encoding='utf-8-sig'))
    normalized=evidence['normalized_result']
    errors=[e for e in normalized['events']['items'] if e['kind']=='page-error' or (e['kind']=='console' and e.get('level')=='error')]
    assert not errors,(name,errors)
    assert normalized['completeness']['status']=='complete',(name,normalized['completeness'])
    artifact=normalized['steps'][-1]['artifacts']['screenshot']['value']
    file=ARTIFACTS/f'{prefix}-{name}.png'
    file.write_bytes(base64.b64decode(artifact['data_base64']))
    return Image.open(file).convert('RGB'),evidence['evidence_id']

def compare(tolerance=0):
    reports=[]
    for spec in SPECS:
      name=spec['name'];before,before_id=screenshot('before',name);after,after_id=screenshot('after',name)
      assert before.size==after.size,(name,before.size,after.size)
      diff=ImageChops.difference(before,after)
      channels=diff.split();maximum=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2])
      changed=before.width*before.height-maximum.histogram()[0]
      if changed:
        maximum.point(lambda value:255 if value else 0).save(ARTIFACTS/f'diff-{name}.png')
      above=sum(maximum.histogram()[tolerance+1:])
      reports.append({'name':name,'size':before.size,'changed_pixels':changed,'pixels_over_tolerance':above,'channel_tolerance':tolerance,'total_pixels':before.width*before.height,'max_channel_difference':maximum.getextrema()[1],'difference_bounds':maximum.getbbox(),'before_evidence':before_id,'after_evidence':after_id})
      print(json.dumps(reports[-1]),flush=True)
    (ARTIFACTS/'visual-comparison.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
    return all(report['pixels_over_tolerance']==0 for report in reports)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--capture',action='store_true');parser.add_argument('--recapture-baseline',action='store_true');parser.add_argument('--pixel-tolerance',type=int,default=0);args=parser.parse_args()
    ARTIFACTS.mkdir(parents=True,exist_ok=True)
    if args.capture:
      with ThreadPoolExecutor(max_workers=2) as pool:
        for future in as_completed([pool.submit(capture,spec) for spec in SPECS]): print('Captured '+future.result(),flush=True)
    if args.recapture_baseline:
      for spec in SPECS:
        old=ARTIFACTS/f"before-{spec['name']}.json";backup=ARTIFACTS/f"original-mcp-before-{spec['name']}.json"
        if not backup.exists():shutil.copy2(old,backup)
      with ThreadPoolExecutor(max_workers=2) as pool:
        for future in as_completed([pool.submit(capture,spec,'before',4173) for spec in SPECS]):print('Recaptured original '+future.result(),flush=True)
    raise SystemExit(0 if compare(args.pixel_tolerance) else 1)
