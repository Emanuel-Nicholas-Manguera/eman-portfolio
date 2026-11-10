import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthController } from './authController.ts'
const owner = { userId:'owner', accessToken:'test-token-a' }
const ready = { stage:'ready', email:'owner@example.test', userId:'owner', sessionId:'00000000-0000-4000-8000-000000000001' }
const tick = () => new Promise(resolve => setTimeout(resolve, 5))
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject} }
function fixture(inspect = async()=>ready) {
  const views=[], errors=[], busy=[]
  let checks=0
  const controller=createAuthController({inspect:()=>{checks++;return inspect()},onView:v=>views.push(v),onError:e=>errors.push(e),onBusy:b=>busy.push(b)})
  controller.onAuthChange('INITIAL_SESSION',owner)
  return {controller,views,errors,busy,checks:()=>checks}
}
test('initial load verifies with the loading view before opening the dashboard',async()=>{
  const pending=deferred(),f=fixture(()=>pending.promise)
  const checking=f.controller.refresh()
  assert.equal(f.views.at(-1).stage,'checking')
  pending.resolve(ready);await checking
  assert.deepEqual(f.views.at(-1),ready)
  f.controller.dispose()
})
test('refocusing an unchanged verified session does not reload or recheck the editor',async()=>{
  const f=fixture();await f.controller.refresh();f.views.length=0
  for(let n=0;n<4;n++)f.controller.onAuthChange('SIGNED_IN',{...owner})
  await tick()
  assert.equal(f.checks(),1);assert.deepEqual(f.views,[])
  f.controller.dispose()
})
test('token renewal verifies in the background without replacing the mounted dashboard',async()=>{
  let result=Promise.resolve(ready);const f=fixture(()=>result)
  await f.controller.refresh();f.views.length=0
  const pending=deferred();result=pending.promise
  f.controller.onAuthChange('TOKEN_REFRESHED',{...owner,accessToken:'test-token-b'})
  await tick();assert.deepEqual(f.views,[])
  pending.resolve(ready);await tick()
  assert.deepEqual(f.views,[ready]);assert.equal(f.busy.at(-1),false)
  f.controller.dispose()
})
test('revoked access and failed background verification still close the workspace',async()=>{
  for(const fail of [false,true]){
    let result=Promise.resolve(ready);const f=fixture(()=>result);await f.controller.refresh();f.views.length=0
    const pending=deferred();result=pending.promise
    f.controller.onAuthChange('TOKEN_REFRESHED',{...owner,accessToken:'test-token-b'});await tick()
    if(fail)pending.reject(new Error('provider details'));else pending.resolve({stage:'denied',email:ready.email})
    await tick();assert.equal(f.views.at(-1).stage,fail?'error':'denied')
    if(fail)assert.equal(f.errors.at(-1),'Unable to check your session. Please try again.')
    f.controller.dispose()
  }
})
test('a different user or a new sign-in token is gated before verification',async()=>{
  for(const session of [{userId:'stranger',accessToken:'other-token'},{...owner,accessToken:'new-login'}]){
    const f=fixture();await f.controller.refresh();f.views.length=0
    f.controller.onAuthChange('SIGNED_IN',session)
    assert.equal(f.views.at(-1).stage,'checking')
    f.controller.dispose()
  }
})
test('sign-out cancels a pending background check so it cannot reopen the dashboard',async()=>{
  let result=Promise.resolve(ready);const f=fixture(()=>result);await f.controller.refresh()
  const pending=deferred();result=pending.promise
  f.controller.onAuthChange('TOKEN_REFRESHED',{...owner,accessToken:'test-token-b'});await tick()
  f.controller.onAuthChange('SIGNED_OUT',null)
  pending.resolve(ready);await tick()
  assert.equal(f.views.at(-1).stage,'signedOut')
  assert.equal(f.busy.at(-1),false);f.controller.dispose()
})
test('account changes invalidate an old in-flight access result',async()=>{
  const old=deferred(), fresh=deferred();let result=old.promise
  const f=fixture(()=>result);const first=f.controller.refresh()
  result=fresh.promise
  f.controller.onAuthChange('SIGNED_IN',{userId:'stranger',accessToken:'other-token'});await tick()
  old.resolve(ready);await first
  assert.equal(f.views.at(-1).stage,'checking')
  fresh.resolve({stage:'denied',email:'stranger@example.test'});await tick()
  assert.equal(f.views.at(-1).stage,'denied');f.controller.dispose()
})
test('explicit sign-out takes priority over a pending session refresh',async()=>{
  let result=Promise.resolve(ready);const f=fixture(()=>result);await f.controller.refresh()
  const pending=deferred();result=pending.promise
  f.controller.onAuthChange('TOKEN_REFRESHED',{...owner,accessToken:'test-token-b'});await tick()
  await f.controller.signOut(async()=>({stage:'signedOut'}))
  pending.resolve(ready);await tick()
  assert.equal(f.views.at(-1).stage,'signedOut');f.controller.dispose()
})
test('disposing a check cancels callbacks and ignores late auth events',async()=>{
  const pending=deferred(),f=fixture(()=>pending.promise);const check=f.controller.refresh()
  f.controller.dispose();const count=f.views.length
  pending.resolve(ready);await check
  f.controller.onAuthChange('SIGNED_IN',owner);await tick()
  assert.equal(f.views.length,count)
})
