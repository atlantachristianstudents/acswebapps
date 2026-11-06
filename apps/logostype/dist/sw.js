// Compatibility worker for installed copies that used the former dist/ URL.
// The runnable app and its offline cache now live one directory above.
const appRoot=new URL('../',self.location.href);
function destination(url){
  const source=new URL(url),target=new URL(source.pathname.endsWith('/reading.html')?'reading.html':'./',appRoot);
  target.search=source.search;target.hash=source.hash;
  return target.href;
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()){
    const legacy=key.match(/^logostype-v(\d+)$/);
    if(legacy&&Number(legacy[1])<43)await caches.delete(key);
  }
  await self.clients.claim();
  for(const client of await self.clients.matchAll({type:'window'})){
    if(client.url.startsWith(new URL('./',self.location.href).href))await client.navigate(destination(client.url));
  }
})()));
self.addEventListener('fetch',event=>{
  if(event.request.mode==='navigate')event.respondWith(Response.redirect(destination(event.request.url),302));
});
