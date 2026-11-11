import assert from 'node:assert/strict'
import test from 'node:test'
import { assetIds, safeLink, validateContent, blankContent, resolveSocialLinks } from './content.ts'
import { resolvePortfolio } from './portfolio.ts'

test('public link validation blocks script and data URLs',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hello','file:///tmp/test','not a link'])assert.equal(safeLink(url),'')
  assert.equal(safeLink('https://github.com/example'),'https://github.com/example')
})
test('only images referenced by a document resolve into that publication',()=>{
  const doc={document_id:'project',kind:'project',sort_order:0,content:{name:'Work',kind:'App',description:'A project',technologies:[],photos:[{assetId:'a',label:'Cover',note:'Public caption'}],source:'javascript:alert(1)'}}
  const wrong=[{document_id:'private-draft',asset_id:'a',url:'https://example.com/private.png'}]
  let result=resolvePortfolio([doc],wrong)
  assert.equal(result.projects[0].photos[0].src,undefined)
  assert.equal(result.projects[0].source,'')
  result=resolvePortfolio([doc],[{document_id:'project',asset_id:'a',url:'https://example.com/approved.webp',alt_text:'Public alt'}])
  assert.equal(result.projects[0].photos[0].src,'https://example.com/approved.webp')
  assert.equal(result.projects[0].photos[0].alt,'Public alt')
  assert.equal(result.projects[0].photos[0].note,'Public caption')
})
test('unpublished sections stay absent, and ordering follows published display order',()=>{
  const empty=resolvePortfolio([],[])
  assert.equal(empty.introduction,null);assert.equal(empty.contact,null);assert.deepEqual(empty.projects,[])
  const docs=[{document_id:'b',kind:'experience',sort_order:2,content:{name:'Second'}},{document_id:'a',kind:'experience',sort_order:1,content:{name:'First'}}]
  assert.deepEqual(resolvePortfolio(docs,[]).experiences.map(e=>e.name),['First','Second'])
})
test('editor validation rejects incomplete albums, invalid links and dates',()=>{
  assert.throws(()=>validateContent('project','New',blankContent('project')),/name/)
  assert.doesNotThrow(()=>validateContent('project','New draft',blankContent('project'),false))
  const p={name:'Example',description:'A project',photos:[],technologies:[]}
  assert.throws(()=>validateContent('project','New',p),/at least one/)
  assert.throws(()=>validateContent('project','New',{...p,photos:[{label:'Cover',assetId:'a'}],source:'javascript:alert(1)'}),/https/)
  assert.throws(()=>validateContent('experience','Role',{...blankContent('experience'),name:'Company',company:'Company',role:'Developer',summary:'Work',dates:{start:'2026-12',end:'2026-01'}}),/chronological/)
  assert.deepEqual(assetIds({suitAssetId:'a',graduationAssetId:'a',photos:[{assetId:'b'}]}),['a','b'])
})

test('older introductions inherit published socials, while an explicit empty list hides them', () => {
  const contact = {
    github: 'https://github.com/example',
    linkedin: 'javascript:alert(1)',
    email: 'owner@example.test',
    facebook: 'https://www.facebook.com/example',
    githubCaption: 'My projects',
  }
  assert.deepEqual(resolveSocialLinks(undefined, contact).map(({ platform }) => platform),
    ['github', 'gmail', 'facebook'])
  assert.deepEqual(resolveSocialLinks([], contact), [])
  assert.deepEqual(resolveSocialLinks(null, contact), [])
})

test('social publishing validates destinations and keeps the chosen order', () => {
  const intro = {
    ...blankContent('introduction'),
    name: 'Owner',
    role: 'Developer',
    description: 'About me',
  }
  const instagram = { platform: 'instagram', destination: 'https://instagram.com/example', caption: '' }
  const x = { platform: 'x', destination: 'https://x.com/example', caption: '' }
  assert.doesNotThrow(() => validateContent('introduction', 'Intro', { ...intro, socialLinks: [instagram, x] }))
  assert.deepEqual(resolveSocialLinks([instagram, x]), [instagram, x])
  assert.throws(() => validateContent('introduction', 'Intro', { ...intro, socialLinks: [x, x] }), /only once/)
  assert.throws(() => validateContent('introduction', 'Intro', {
    ...intro, socialLinks: [{ ...x, destination: 'javascript:alert(1)' }],
  }), /valid profile URL/)
  assert.doesNotThrow(() => validateContent('introduction', 'Intro', {
    ...intro, socialLinks: [{ ...x, destination: '' }],
  }, false))
})
