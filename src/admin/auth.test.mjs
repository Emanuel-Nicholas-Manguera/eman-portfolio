import assert from 'node:assert/strict'
import test from 'node:test'
import { authErrorMessage, enrollAdminAuthenticator, inspectAdminSession, signInAdmin, signOutAdmin, verifyAdminAuthenticator } from './auth.ts'

const ok = (data) => ({data, error:null})
const fail = (message) => ({data:null,error:new Error(message)})
const testToken = `test.${Buffer.from(JSON.stringify({session_id:'00000000-0000-4000-8000-000000000001'})).toString('base64url')}.unsigned`
function fixture(status = 'ready') {
  const calls = []
  const client = {
    rpc: async (name) => {calls.push(['rpc',name]);return ok(status)},
    auth: {
      getSession: async () => ok({session:{access_token:testToken}}),
      getUser: async () => ok({user:{id:'owner',email:'owner@example.test',user_metadata:{admin:true}}}),
      signInWithPassword: async (credentials) => {calls.push(['signIn',credentials]);return ok({})},
      signOut: async (options) => {calls.push(['signOut',options]);return ok({})},
      mfa: {
        listFactors: async () => ok({all:[],totp:[{id:'verified',status:'verified',friendly_name:'My authenticator'},{id:'unfinished',status:'unverified'}]}),
        unenroll: async (options) => {calls.push(['unenroll',options]);return ok({})},
        enroll: async (options) => {calls.push(['enroll',options]);return ok({id:'new-factor',totp:{qr_code:'<svg/>',secret:'test-only-secret'}})},
        challengeAndVerify: async (options) => {calls.push(['verify',options]);return ok({})},
      },
    },
  }
  return {client,calls}
}

test('missing session returns to sign-in without a database access request', async () => {
  const {client,calls}=fixture()
  client.auth.getSession=async()=>ok({session:null})
  assert.deepEqual(await inspectAdminSession(client),{stage:'signedOut'})
  assert.equal(calls.length,0)
})
test('stored/forged user metadata cannot bypass the server access decision', async () => {
  const {client}=fixture('denied')
  assert.equal((await inspectAdminSession(client)).stage,'denied')
})
test('failed identity validation or access lookup never opens a workspace', async () => {
  const {client,calls}=fixture()
  client.auth.getUser=async()=>fail('expired session')
  await assert.rejects(()=>inspectAdminSession(client),/expired session/)
  assert.equal(calls.length,0)
  const offline=fixture().client
  offline.rpc=async()=>fail('offline')
  await assert.rejects(()=>inspectAdminSession(offline),/offline/)
  await assert.rejects(()=>inspectAdminSession(fixture('unexpected').client),/Unrecognized/)
})
test('password sign-in trims only the email and retains password whitespace', async () => {
  const {client,calls}=fixture('enroll')
  assert.equal((await signInAdmin(client,' owner@example.test ',' password ')).stage,'enroll')
  assert.deepEqual(calls[0],['signIn',{email:'owner@example.test',password:' password '}])
})
test('failed password sign-in does not proceed to MFA or permission lookup', async () => {
  const {client,calls}=fixture()
  client.auth.signInWithPassword=async()=>fail('invalid credentials')
  await assert.rejects(()=>signInAdmin(client,'owner@example.test','incorrect'),/invalid credentials/)
  assert.equal(calls.length,0)
})
test('password-only sessions require a verified authenticator, and activation stays separate', async () => {
  const {client}=fixture('verify')
  const state=await inspectAdminSession(client)
  assert.equal(state.stage,'verify')
  assert.deepEqual(state.factors,[{id:'verified',name:'My authenticator'}])
  assert.equal((await inspectAdminSession(fixture('pending').client)).stage,'pending')
  client.auth.mfa.listFactors=async()=>ok({totp:[],all:[]})
  await assert.rejects(()=>inspectAdminSession(client),/Authenticator unavailable/)
})
test('enrollment requires server permission and removes only this UI’s unfinished factor', async () => {
  const denied=fixture('denied')
  assert.equal((await enrollAdminAuthenticator(denied.client)).stage,'denied')
  assert.equal(denied.calls.some(([name])=>name==='enroll'),false)
  const {client,calls}=fixture('enroll')
  client.auth.mfa.listFactors=async()=>ok({all:[
    {id:'unfinished',factor_type:'totp',status:'unverified',friendly_name:'Portfolio authenticator'},
    {id:'verified',factor_type:'totp',status:'verified',friendly_name:'Portfolio authenticator'},
    {id:'another',factor_type:'totp',status:'unverified',friendly_name:'Another app'},
  ],totp:[]})
  const state=await enrollAdminAuthenticator(client)
  assert.equal(state.stage,'enrolling')
  assert.equal(state.factorId,'new-factor')
  assert.ok(state.qr.startsWith('data:image/svg+xml'))
  assert.deepEqual(calls.filter(([name])=>name==='unenroll'),[['unenroll',{factorId:'unfinished'}]])
})
test('MFA failures never authorize and six digits are required before the request', async () => {
  const {client,calls}=fixture()
  await assert.rejects(()=>verifyAdminAuthenticator(client,'factor','123'),/six-digit/)
  assert.equal(calls.length,0)
  client.auth.mfa.challengeAndVerify=async()=>fail('invalid code')
  await assert.rejects(()=>verifyAdminAuthenticator(client,'factor','123456'),/invalid code/)
  assert.equal(calls.some(([name])=>name==='rpc'),false)
})
test('successful MFA still waits for server approval; it cannot self-activate ownership', async () => {
  const {client,calls}=fixture('pending')
  assert.equal((await verifyAdminAuthenticator(client,'factor','123456')).stage,'pending')
  assert.deepEqual(calls,[['verify',{factorId:'factor',code:'123456'}],['rpc','cms_auth_status']])
})
test('sign-out targets the current session and reports network failure instead of false success', async () => {
  const {client,calls}=fixture()
  assert.deepEqual(await signOutAdmin(client),{stage:'signedOut'})
  assert.deepEqual(calls,[['signOut',{scope:'local'}]])
  client.auth.signOut=async()=>fail('offline')
  await assert.rejects(()=>signOutAdmin(client),/offline/)
})
test('provider error details and secrets are never used as visible error messages', () => {
  assert.equal(authErrorMessage(new Error('sensitive provider detail'),'Please retry.'),'Please retry.')
  assert.match(authErrorMessage({code:'invalid_credentials'},'fallback'),/email and password/)
  assert.match(authErrorMessage({code:'mfa_verification_failed'},'fallback'),/current code/)
})
