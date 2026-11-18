"""Exercise the exported Next.js site with REA browser scenarios."""
from pathlib import Path
import json,re,shutil,subprocess,sys

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/'evidence'/'next-migration'
def wait(name,ms=500):return {'action':'wait_for_timeout','step_id':name,'duration_ms':ms}
def click(name,selector):return {'action':'click','step_id':name,'locator':{'kind':'css','selector':selector},'timeout_ms':5000}
def press(name,key,selector='body'):return {'action':'press','step_id':name,'locator':{'kind':'css','selector':selector},'key':key,'timeout_ms':5000}
def run(name,url,actions,width=1440,height=900,each=False):
    request={'browser':{'mode':'launch','executable_path':r'C:\Program Files\Google\Chrome\Application\chrome.exe','headless':True},'start_url':{'url':'http://localhost:4174/'+url},'actions':actions,'capture':{'after_each_step':['accessibility'] if each else [],'at_end':['dom','screenshot'],'events':['page-errors','console']},'environment':{'viewport':{'width':width,'height':height},'reduced_motion':'no-preference'}}
    input_file=ARTIFACTS/f'{name}.input.json';output_file=ARTIFACTS/f'{name}.json'
    input_file.write_text(json.dumps(request),encoding='utf-8')
    command=[shutil.which('rea')] if shutil.which('rea') else [shutil.which('npx'),'-y','rea-agents@6.7.0']
    if '--verify-only' not in sys.argv:
      with output_file.open('wb') as out,(ARTIFACTS/f'{name}.stderr.txt').open('wb') as err:
        subprocess.run(command+['capture-browser-scenario',str(input_file),'--format','json'],stdout=out,stderr=err,cwd=ROOT,check=True,timeout=120)
    evidence=json.loads(output_file.read_text(encoding='utf-8-sig'));result=evidence['normalized_result']
    errors=[event for event in result['events']['items'] if event['kind']=='page-error' or(event['kind']=='console' and event.get('level')=='error')]
    assert not errors,(name,errors)
    assert all(step['status']=='completed' for step in result['steps']),[(s['step_id'],s['error']) for s in result['steps'] if s['status']!='completed']
    assert result['completeness']['status']=='complete'
    return evidence

actions=[wait('warm',900)]
for index in range(3):actions += [press(f'down-{index}','PageDown'),wait(f'down-rest-{index}',300)]
actions += [press('end','End'),wait('footer-rest',600),press('home','Home'),wait('home-rest',1000)]
motion=run('next-motion','?qa=scroll',actions)
dom=motion['normalized_result']['steps'][-1]['artifacts']['dom']['value']['text']
report=json.loads(re.search(r'<script type="application/json" id="scroll-qa-report">(.*?)</script>',dom,re.S)[1])
assert report['hero']['progress']=='0.000' and report['hero']['openingVisible']=='1.000'
assert not report['hero']['videos'][0]['paused'] and report['hero']['videos'][1]['paused']
assert report['heroHeightChanges']==0 and report['scriptScrollCalls']==0 and not report['overflow'],report
print('PASS: native scrolling, real video playback, hero reversal, footer and Home.',flush=True)

keys=['choate-construction-company','imc-construction','rogers-obrien-construction-company','charles-pankow-builders-ltd','saunders-construction-inc','lease-crutcher-lewis','krusinski-construction-company']
actions=[wait('ready',700),click('map','.citadel-site-nav a[href="#map"]'),wait('map-rest',1000)]
for key in keys:actions += [click('select-'+key,f'.citadel-map-partner-button[data-partner-key="{key}"]'),wait('card-'+key,250)]
actions += [click('about','.citadel-site-nav a[href="#about"]'),wait('about-rest',900),click('photo-next','[data-module="about-gallery"] [data-carousel-next]'),click('photo-prev','[data-module="about-gallery"] [data-carousel-prev]'),click('cases','.citadel-site-nav a[href="#case-studies"]'),wait('cases-rest',900),click('dialog-open','[data-carousel-track] > [data-carousel-slide]:first-child [data-case-study-trigger]'),wait('dialog-visible',100),press('dialog-close','Escape','[data-case-study-modal-close]'),click('case-slide-2','#case-studies [data-carousel-dots] button:nth-child(2)'),wait('slide-rest',400)]
desktop=run('next-desktop-controls','?qa=visual',actions,each=True)
for step in desktop['normalized_result']['steps']:
    text=step['artifacts'].get('accessibility',{}).get('value',{}).get('text','')
    if step['step_id'].startswith('card-'):assert '[pressed]' in text,step['step_id']
    if step['step_id']=='dialog-visible':assert 'dialog' in text
    if step['step_id']=='dialog-close':assert 'dialog' not in text
print('PASS: all seven partners, gallery, carousel and project dialog/Escape.',flush=True)

actions=[wait('ready',700),click('imc','.citadel-map-partner-button[data-partner-key="imc-construction"]'),wait('imc-rest',900),click('previous-to-cases','[data-mobile-nav-prev]'),wait('cases-rest',900),click('dialog-open','[data-carousel-track] > [data-carousel-slide]:first-child [data-case-study-trigger]'),press('dialog-close','Escape','[data-case-study-modal-close]'),click('previous-to-about','[data-mobile-nav-prev]'),wait('about-rest',900),click('next-to-cases','[data-mobile-nav-next]'),wait('return-rest',900)]
phone=run('next-phone-controls','?qa=visual#map',actions,390,844)
dom=phone['normalized_result']['steps'][-1]['artifacts']['dom']['value']['text']
assert 'data-active-section="case-studies"' in dom
print('PASS: mobile map selection, dialog, and Map / Cases / About / Cases pager.',flush=True)
summary={'motion':motion['evidence_id'],'desktop':desktop['evidence_id'],'phone':phone['evidence_id'],'page_errors':0,'console_errors':0,'hero_height_changes':report['heroHeightChanges'],'programmatic_scroll_calls':report['scriptScrollCalls']}
(ARTIFACTS/'interaction-checks.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
