/** Direction-aware sprite transitions. Delta time is in seconds. */
export function movementDirection(vx,vz,side){
 if(Math.hypot(vx,vz)<.12)return null;
 if(Math.abs(vx)>=Math.abs(vz))return vx<0?'left':'right';
 return vz*side<0?'forward':'backward';
}
export function createAnimator(){return {from:'idle',to:'idle',blend:1,phase:0,direction:null};}
export function advanceAnimator(state,actor,dt){
 const delta=Math.max(0,Math.min(dt,.1));const speed=Math.hypot(actor.vx,actor.vz);const dir=movementDirection(actor.vx,actor.vz,actor.side);
 if(dir){state.phase+=(5+Math.min(speed,6)*1.2)*delta;state.direction=dir;}else state.phase=0;
 const running=!!dir;const step=running&&Math.sin(state.phase)>-.15;
 const target=actor.pose!=='idle'?actor.pose:(running&&step?'run_'+dir:'idle');
 if(target!==state.to){state.from=state.blend<.5?state.from:state.to;state.to=target;state.blend=0;}
 state.blend=Math.min(1,state.blend+delta/(actor.pose==='idle'?.13:.08));
 const motion=running?Math.min(speed/3,1):0;
 const bob=motion*.035*Math.abs(Math.sin(state.phase));
 const lean=running?Math.max(-.08,Math.min(.08,-actor.vx*.013))+Math.sin(state.phase)*.018*motion:0;
 return {from:state.from,to:state.to,blend:state.blend,bob,lean,running,direction:dir};
}
