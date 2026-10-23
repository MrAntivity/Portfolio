const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('hex');
function equal(a, b) { const x=Buffer.from(a || ''), y=Buffer.from(b || ''); return x.length === y.length && crypto.timingSafeEqual(x,y); }
async function pinFields(pin) {
  if (pin === '') return { pinSalt: '', pinHash: '' };
  if (typeof pin !== 'string' || !/^\d{4,12}$/.test(pin)) throw new Error('Use a PIN with 4–12 digits.');
  const pinSalt=random(); return {pinSalt, pinHash:(await scrypt(pin,pinSalt,32)).toString('hex')};
}
async function checkPin(pin, share) {
  if (!share.pinHash) return true;
  if (typeof pin !== 'string' || !/^\d{4,12}$/.test(pin)) return false;
  return equal((await scrypt(pin,share.pinSalt,32)).toString('hex'),share.pinHash);
}
function session(share, now=Date.now()) {
  const expires=String(now+60*60*1000);
  return expires+'.'+crypto.createHmac('sha256',share.sessionKey).update(share.id+':'+expires).digest('hex');
}
function validSession(token,share,now=Date.now()) {
  if (typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires,signature]=token.split('.');
  return Number(expires)>now && Number(expires)<=now+60*60*1000
    && equal(signature,crypto.createHmac('sha256',share.sessionKey).update(share.id+':'+expires).digest('hex'));
}
function folderScope(root,folders) {
  const ids=new Set([root]); let changed=true;
  while(changed){changed=false;for(const f of folders)if(ids.has(f.parentId)&&!ids.has(f.id)){ids.add(f.id);changed=true;}}
  return ids;
}
function pages(file) { return file.pages?.length ? file.pages : file.storagePath ? [{...file,fileName:file.fileName||file.name}] : []; }
function allowedPath(path,uid) { return typeof path==='string' && path.startsWith(`users/${uid}/files/`) && !path.split('/').includes('..'); }
module.exports={digest,random,pinFields,checkPin,session,validSession,folderScope,pages,allowedPath};
