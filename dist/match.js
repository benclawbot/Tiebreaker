// Tennis match simulation; all coordinates are metres and seconds.
export const COURT={baseline:11.885,sideline:4.115,service:6.4,net:.914,ball:.0335};
export const SURFACES={hard:{rest:.72,loss:.10},indoor:{rest:.74,loss:.08},clay:{rest:.80,loss:.25},grass:{rest:.55,loss:.15}};
const LEVELS=[[.55,2,.30],[.45,2.5,.24],[.38,3,.18],[.32,3.4,.14],[.27,3.8,.10],[.24,4.2,.07],[.21,4.7,.05],[.18,5.1,.035],[.15,5.5,.025],[.12,6,.015]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const advance=(a,b,d)=>a+clamp(b-a,-d,d);
function actor(side){return {side,x:0,z:side*13,vx:0,vz:0,pose:'idle',poseTime:0,target:null};}
export function scoreLabel(p,q,tie=false){if(tie)return String(p);if(p>=3&&q>=3){if(p===q)return '40';return p>q?'AD':'40';}return ['0','15','30','40'][Math.min(p,3)];}
export function initialScore(){return {p:0,c:0,pg:0,cg:0,server:1,tiebreak:false,tieStart:0,finished:false};}
export function awardScore(s,winner,noAd=false){
 if(winner===1)s.p++;else s.c++;
 if(s.tiebreak){let n=s.p+s.c;if(Math.max(s.p,s.c)>=7&&Math.abs(s.p-s.c)>=2){winner===1?s.pg++:s.cg++;s.finished=true;return;}s.server=n%4===1||n%4===2?-s.tieStart:s.tieStart;return;}
 if(Math.max(s.p,s.c)>=4&&(noAd||Math.abs(s.p-s.c)>=2)){winner===1?s.pg++:s.cg++;s.p=s.c=0;s.server*=-1;if(Math.max(s.pg,s.cg)>=6&&Math.abs(s.pg-s.cg)>=2){s.finished=true;return;}if(s.pg===6&&s.cg===6){s.tiebreak=true;s.tieStart=s.server;}}
}
export function serveSide(score){return (score.p+score.c)%2===0?1:-1;}
// Joystick x aims left/right on screen; up (negative z) aims deeper.
export function humanShotTarget(score,shot,isServe,aim={x:0,z:0}){
 const x=clamp(Number(aim.x)||0,-1,1),z=clamp(Number(aim.z)||0,-1,1);
 if(isServe){const sign=-serveSide(score),centre=sign*2.05;return {x:clamp(centre+x*1.65,sign<0?-3.8:.3,sign<0?-.3:3.8),z:-clamp(4.45-z*1.25,1.5,6.1)};}
 const depth=shot==='lob'?10.0:8.3;return {x:clamp(x*3.65,-3.65,3.65),z:-clamp(depth-z*2.5,2.0,11.4)};
}

export function pointAfterBounce({bounce,serve,from,x,z,score,netTouched=false}){
 const r=COURT.ball;if(bounce>=2)return {type:'point',winner:from,reason:'DOUBLE BOUNCE'};
 const receiverSide=z*from<0;
 if(serve){let sign=-serveSide(score)*from;let inBox=receiverSide&&Math.abs(x)<=COURT.sideline+r&&x*sign>=-r&&Math.abs(z)<=COURT.service+r;
  if(inBox&&netTouched)return {type:'let'};return inBox?{type:'in'}:{type:'fault'};}
 return receiverSide&&Math.abs(x)<=COURT.sideline+r&&Math.abs(z)<=COURT.baseline+r?{type:'in'}:{type:'point',winner:-from,reason:'OUT'};
}
export function solveShot(ball,target,peak,gravity=9.81){let apex=Math.max(peak,ball.y+.08);let up=Math.sqrt(2*(apex-ball.y)/gravity);let down=Math.sqrt(2*(apex-COURT.ball)/gravity);let time=up+down;return {x:(target.x-ball.x)/time,y:gravity*up,z:(target.z-ball.z)/time};}
// Sample the physical flight up to the next forbidden bounce, including one bounce.
export function intercept(ball,vel,gravity,from,bounces,serve,who,speed,surface){
 const b={...ball},v={...vel};let count=bounces;let dt=.035;
 // Don't auto-chase a ball whose first bounce is already predicted out.
 if(!serve&&bounces===0&&gravity>0){const d=vel.y*vel.y+2*gravity*Math.max(0,ball.y-COURT.ball);const t=(vel.y+Math.sqrt(d))/gravity;const x=ball.x+vel.x*t,z=ball.z+vel.z*t;if(Math.abs(x)>COURT.sideline+COURT.ball||Math.abs(z)>COURT.baseline+COURT.ball||z*from>=0)return null;}
 for(let t=dt;t<3.2;t+=dt){v.y-=gravity*dt;b.x+=v.x*dt;b.y+=v.y*dt;b.z+=v.z*dt;
  if(b.y<=COURT.ball){count++;if(count>=2)break;b.y=COURT.ball;v.y=-v.y*surface.rest;v.x*=1-surface.loss;v.z*=1-surface.loss;}
  if(b.z*who.side<=.1||(count===0&&(serve||Math.abs(who.z)>7.5))||b.y<.20||b.y>2.15)continue;
  if(Math.abs(b.x)>7||Math.abs(b.z)>17.5)continue;
  const dist=Math.hypot(b.x-who.x,b.z-who.z);
  if(dist<=speed*t+.85)return {x:clamp(b.x,-6.7,6.7),z:clamp(b.z*who.side,1.1,17)*who.side,t};
 }
 return null;
}
export class TennisMatch{
 constructor({level=4,surface='hard',noAd=false,random=Math.random,onEvent=()=>{}}={}){this.level=clamp(level,1,10);this.surface=SURFACES[surface]||SURFACES.hard;this.noAd=noAd;this.random=random;this.onEvent=onEvent;this.score=initialScore();this.human=actor(1);this.cpu=actor(-1);this.ball={x:0,y:1,z:13};this.vel={x:0,y:0,z:0};this.gravity=9.81;this.phase='setup';this.clock=0;this.serveAttempt=1;this.from=0;this.bounces=0;this.isServe=false;this.netTouched=false;this.intent=null;this.reaction=0;this.cooldown=0;this.targetClock=0;this.aim={x:0,z:0};this.events=[];this.startPoint();}
 emit(type,extra={}){const e={type,...extra};this.events.push(e);if(this.events.length>256)this.events.shift();this.onEvent(e);}
 serverActor(){return this.score.server===1?this.human:this.cpu;}
 hand(){const a=this.serverActor(),left=a.x<0;return {x:a.x+(this.score.server===1?(left?.28:-.46):(left?.15:.31)),y:this.score.server===1?(left?.94:1.23):(left?1.10:1.13),z:a.z+.12};}
 startPoint(keepAttempt=false){if(!keepAttempt)this.serveAttempt=1;let side=serveSide(this.score);let server=this.score.server;this.human.x=server===1?side*1.25:side*1.1;this.cpu.x=server===-1?-side*1.25:-side*1.1;this.human.z=13;this.cpu.z=-13;this.human.vx=this.human.vz=this.cpu.vx=this.cpu.vz=0;this.phase='hold';this.clock=0;this.intent=null;this.from=0;this.bounces=0;this.netTouched=false;this.cooldown=0;this.human.pose=this.cpu.pose='idle';this.serverActor().pose=this.serverActor().x<0?'hold_left':'hold';Object.assign(this.ball,this.hand());this.emit('ready',{server,attempt:this.serveAttempt});}
 toss(){if(this.phase!=='hold')return;this.phase='toss';this.clock=0;this.serverActor().pose=this.serverActor().x<0?'hold_left':'hold';this.emit('toss');}
 shot(type,aim=this.aim){this.aim={x:clamp(Number(aim.x)||0,-1,1),z:clamp(Number(aim.z)||0,-1,1)};if(this.score.finished)return;if(this.phase==='hold'&&this.score.server===1){this.toss();return;}if(this.phase==='toss'&&this.score.server===1){let quality=Math.abs(this.clock-.66);if(this.clock<.18){this.emit('hint',{text:'WAIT FOR THE TOSS'});return;}this.fire(1,type,true,quality>.52);return;}if(this.phase==='flight'){this.intent={type,expires:this.clock+3};this.emit('armed',{shot:type});}}
 fault(){this.emit('fault',{attempt:this.serveAttempt});if(this.serveAttempt===1){this.serveAttempt=2;this.phase='pauseFault';this.clock=0;}else this.point(-this.score.server,'DOUBLE FAULT');}
 point(winner,reason){if(this.phase==='end'||this.phase==='matchEnd')return;awardScore(this.score,winner,this.noAd);this.phase=this.score.finished?'matchEnd':'end';this.clock=0;this.intent=null;this.emit('point',{winner,reason,score:{...this.score}});}
 fire(from,shot,isServe=false,miss=false){const dir=-from;const parity=serveSide(this.score);let target,peak;
  if(isServe){target=from===1?humanShotTarget(this.score,shot,true,this.aim):{x:-parity*from*2,z:dir*4.9};peak=Math.max(2.72,this.ball.y+.12);if(miss)target.x=-parity*from*5.2;}
  else{const aim=(Math.abs(this.human.x)>.8?-Math.sign(this.human.x):(this.random()>.5?1:-1))*(1.1+this.level*.13);target=from===1?humanShotTarget(this.score,shot,false,this.aim):{x:clamp((this.random()-.5)*2.0+aim,-3.5,3.5),z:dir*(shot==='lob'?10.3:9.0)};peak=shot==='lob'?5.8:shot==='lift'?3.1:2.55;if(miss)target.x=(this.random()>.5?1:-1)*6;}
  this.gravity=shot==='lift'&&!isServe?11.2:9.81;this.vel=solveShot(this.ball,target,peak,this.gravity);this.phase='flight';this.clock=0;this.from=from;this.bounces=0;this.isServe=isServe;this.netTouched=false;this.reaction=from===1?LEVELS[this.level-1][0]:.04;this.cooldown=.22;this.targetClock=0;const a=from===1?this.human:this.cpu;a.pose=isServe?(from===1&&a.x<0?'serve_left':'serve'):shot==='lob'?'lob':(this.ball.x-a.x)*from<0?'backhand':'forehand';a.poseTime=.32;if(from===1)this.intent=null;this.emit('hit',{from,shot,serve:isServe});}
 move(a,dx,dz,speed,dt,bounds=null){let l=Math.hypot(dx,dz);if(l>1){dx/=l;dz/=l;}let ax=18*dt;a.vx=advance(a.vx,dx*speed,ax);a.vz=advance(a.vz,dz*speed,ax);const maxX=bounds?.maxX??6.7,maxZ=bounds?.maxZ??17;a.x=clamp(a.x+a.vx*dt,-maxX,maxX);a.z=clamp((a.z+a.vz*dt)*a.side,1.1,maxZ)*a.side;}
 update(dt,input={x:0,z:0}){
  if(this.phase==='matchEnd')return;this.aim={x:clamp(input.x||0,-1,1),z:clamp(input.z||0,-1,1)};this.clock+=dt;for(const a of [this.human,this.cpu]){if(a.poseTime>0){a.poseTime-=dt;if(a.poseTime<=0)a.pose='idle';}}
  if(this.phase==='end'){if(this.clock>1.6)this.startPoint();return;}
  if(this.phase==='pauseFault'){if(this.clock>.9)this.startPoint(true);return;}
  if(this.phase==='hold'){Object.assign(this.ball,this.hand());if(this.score.server===-1&&this.clock>.6)this.toss();return;}
  if(this.phase==='toss'){let h=this.hand();let t=this.clock;this.serverActor().pose=t<.22?(this.serverActor().x<0?'hold_left':'hold'):(this.score.server===1&&this.serverActor().x<0?'toss_left':'toss');this.ball.x=h.x+(this.score.server===1&&this.serverActor().x<0?-.22:this.score.server*.44)*Math.min(1,t/.66);this.ball.z=h.z;this.ball.y=h.y+Math.max(0,3.9*t-3.0*t*t);if(this.score.server===-1&&t>.66)this.fire(-1,'drive',true,this.random()>Math.min(.92,.65+this.level*.025));else if(t>1.3){this.phase='hold';this.clock=0;this.serverActor().pose=this.serverActor().x<0?'hold_left':'hold';this.emit('hint',{text:'TOSS AGAIN'});}return;}
  if(this.phase!=='flight')return;
  this.reaction-=dt;this.cooldown-=dt;if(this.intent&&this.clock>this.intent.expires){this.intent=null;this.emit('hint',{text:'SHOT EXPIRED'});}
  this.targetClock-=dt;let receiver=this.from===1?this.cpu:this.human;let speed=receiver.side===1?4:LEVELS[this.level-1][1];
  if(this.targetClock<=0){if(receiver===this.cpu)receiver.target=intercept(this.ball,this.vel,this.gravity,this.from,this.bounces,this.isServe,receiver,speed,this.surface);this.targetClock=.09;}
  let hx=clamp(input.x||0,-1,1),hz=clamp(input.z||0,-1,1);if(hx===0)this.human.vx=0;if(hz===0)this.human.vz=0;this.move(this.human,hx,hz,4,dt,input.bounds);
  let cx=0,cz=0;if(receiver===this.cpu&&receiver.target&&this.reaction<=0){cx=clamp((receiver.target.x-receiver.x)*1.8,-1,1);cz=clamp((receiver.target.z-receiver.z)*1.8,-1,1);}this.move(this.cpu,cx,cz,LEVELS[this.level-1][1],dt);
  const old={...this.ball};this.vel.y-=this.gravity*dt;this.ball.x+=this.vel.x*dt;this.ball.y+=this.vel.y*dt;this.ball.z+=this.vel.z*dt;
  if(old.z*this.ball.z<=0){let f=old.z/(old.z-this.ball.z),height=old.y+(this.ball.y-old.y)*f;if(height<COURT.net+COURT.ball){if(this.isServe&&height>COURT.net-.10){this.netTouched=true;this.vel.z*=.65;this.vel.y*=.65;this.emit('netClip');}else{if(this.isServe)this.fault();else this.point(-this.from,'NET');return;}}}
  if(this.ball.y<=COURT.ball){this.ball.y=COURT.ball;this.bounces++;let res=pointAfterBounce({bounce:this.bounces,serve:this.isServe,from:this.from,x:this.ball.x,z:this.ball.z,score:this.score,netTouched:this.netTouched});if(res.type==='fault'){this.fault();return;}if(res.type==='let'){this.emit('let');this.phase='pauseFault';this.clock=0;return;}if(res.type==='point'){this.point(res.winner,res.reason);return;}this.vel.y=-this.vel.y*this.surface.rest;this.vel.x*=1-this.surface.loss;this.vel.z*=1-this.surface.loss;this.emit('bounce',{from:this.from,serve:this.isServe});if(this.isServe)this.isServe=false;}
  const near=Math.hypot(this.ball.x-receiver.x,this.ball.z-receiver.z)<=1.15;const legal=this.ball.z*receiver.side>0&&this.ball.y>=.16&&this.ball.y<=2.35&&!this.isServe;
  if(this.cooldown<=0&&near&&legal){if(receiver===this.cpu&&this.reaction<=0){const miss=this.random()<LEVELS[this.level-1][2];this.fire(-1,this.ball.y<.6?'lift':'drive',false,miss);}else if(receiver===this.human&&this.intent){this.fire(1,this.intent.type);}}
  if(Math.abs(this.ball.z)>30||Math.abs(this.ball.x)>20||this.ball.y< -3)this.point(-this.from,'OUT');
 }
}
