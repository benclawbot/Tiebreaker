/** Bounded, single-pointer virtual stick. Shot buttons may use other pointers. */
export function joystickVector(clientX,clientY,rect){
 const radius=Math.min(rect.width,rect.height)/2;
 const dx=(clientX-(rect.left+rect.width/2))/radius,dy=(clientY-(rect.top+rect.height/2))/radius;
 const distance=Math.hypot(dx,dy),scale=distance>1?1/distance:1;
 const x=dx*scale,z=dy*scale;
 return distance<.08?{x:0,z:0}:{x,z};
}
export function bindJoystick(base,knob,onChange){
 let pointer=null;
 function reset(){pointer=null;knob.style.transform='translate(-50%, -50%)';onChange(0,0)}
 function move(event){if(event.pointerId!==pointer)return;event.preventDefault();const v=joystickVector(event.clientX,event.clientY,base.getBoundingClientRect());knob.style.transform=`translate(calc(-50% + ${v.x*30}px), calc(-50% + ${v.z*30}px))`;onChange(v.x,v.z)}
 base.addEventListener('pointerdown',event=>{if(pointer!==null)return;event.preventDefault();pointer=event.pointerId;base.setPointerCapture(pointer);move(event)});
 base.addEventListener('pointermove',move);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])base.addEventListener(name,event=>{if(event.pointerId===pointer)reset()});
 return reset;
}
