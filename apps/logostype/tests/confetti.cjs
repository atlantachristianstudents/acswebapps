const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const source=app.slice(app.indexOf('let activeCelebration ='),app.indexOf('function setReadingView('));
function setup(){
 const canvases=[],visible=[],frames=new Map(),listeners=new Map();let sequence=0;
 const motion={matches:false};
 const document={hidden:false,body:{append(canvas){visible.push(canvas);}},
  addEventListener(type,callback){listeners.set(type,callback);},removeEventListener(type,callback){if(listeners.get(type)===callback)listeners.delete(type);},
  createElement(tag){assert.equal(tag,'canvas');const ctx={draws:[],rotations:0,saves:0,transforms:[],
   save(){this.saves++;},restore(){},translate(){},rotate(){this.rotations++;},fillRect(){},
   setTransform(...args){this.transforms.push(args);},clearRect(){this.draws=[];},drawImage(...args){this.draws.push(args);}};
   const canvas={style:{},setAttribute(){},getContext:()=>ctx,ctx,remove(){this.removed=true;const index=visible.indexOf(this);if(index>=0)visible.splice(index,1);}};
   canvases.push(canvas);return canvas;
  }};
 const context=vm.createContext({document,window:{innerWidth:1200,innerHeight:800,matchMedia:()=>motion},
  Math:Object.assign(Object.create(Math),{random:()=>0.5}),
  requestAnimationFrame:callback=>{const id=++sequence;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 vm.runInContext(source,context);
 return {context,canvases,visible,frames,listeners,motion,document,run:code=>vm.runInContext(code,context),step(time){const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(time);}};
}
const single=setup();single.run('celebrateJourney(1)');
assert.equal(single.visible.length,1);assert.equal(single.frames.size,1);
const screen=single.visible[0],sprite=single.canvases[1];
assert.equal(sprite.ctx.rotations,16,'rotations cached before playback');
single.step(0);assert.equal(screen.ctx.draws.length,0,'off-screen pieces not drawn');
single.step(1200);assert.equal(screen.ctx.draws.length,80,'viewport-sized particle budget');
assert.equal(screen.ctx.rotations,0);assert.equal(screen.ctx.saves,0,'visible frames do not transform individual pieces');
assert(Math.abs(screen.ctx.draws[0][6]-46.4)<0.001,'movement follows wall clock after dropped frames');
for(let frame=1;frame<=31;frame++)single.step(1200+frame*50);
assert(screen.ctx.draws.length<=60,'sustained slow frames reduce density');
single.step(4501);assert.equal(single.visible.length,0);assert.equal(single.frames.size,0);assert.equal(single.listeners.size,0,'animation and listeners cleaned up');

const overlap=setup();overlap.run('celebrateJourney(1);celebrateJourney(1)');assert.equal(overlap.visible.length,1);assert.equal(overlap.canvases.length,2,'duplicates do not allocate another animation');
const old=overlap.visible[0];overlap.run('celebrateJourney(3)');assert(old.removed);assert.equal(overlap.visible.length,1);assert.equal(overlap.frames.size,1);
overlap.run('celebrateJourney(1)');assert.equal(overlap.canvases.length,4,'lower celebration cannot stack over a higher milestone');
overlap.step(0);overlap.step(4000);assert.equal(overlap.visible[0].ctx.draws.length,0);
overlap.step(4020);assert(overlap.visible[0].ctx.draws.length>0,'long celebrations recycle falling pieces');
overlap.step(13501);assert.equal(overlap.visible.length,0,'book celebration retains its duration');

const large=setup();large.context.window.innerWidth=3840;large.context.window.innerHeight=2160;large.run('celebrateJourney(7)');
assert(large.visible[0].width*large.visible[0].height<1003000,'large canvases have a bounded pixel budget');
large.step(0);large.context.window.innerWidth=600;large.context.window.innerHeight=900;large.step(1000);
assert.equal(large.visible[0].width,600);assert.equal(large.visible[0].height,900,'resize updates logical viewport');
large.document.hidden=true;large.listeners.get('visibilitychange')();assert.equal(large.frames.size,0);assert.equal(large.visible.length,0);
const reduced=setup();reduced.motion.matches=true;reduced.run('celebrateJourney(7)');assert.equal(reduced.canvases.length,0,'reduced-motion preference skips confetti');
console.log('Confetti checks passed: cached rotations, off-screen skipping, adaptive density, wall-clock motion, non-overlapping priority, durations, bounded resolution, resizing, reduced motion, and cleanup.');
