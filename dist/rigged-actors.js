import * as THREE from './three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { bakeAnimationClips } from './retarget.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function addRacket(hand){
 const grip=new THREE.Group();hand.add(grip);
 hand.updateWorldMatrix(true,false);grip.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion())).invert();
 const dark=new THREE.MeshStandardMaterial({color:0x1b252d,roughness:.5});
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.012,.017,.30,8),dark);shaft.position.y=.15;grip.add(shaft);
 const hoop=new THREE.Mesh(new THREE.TorusGeometry(.16,.012,8,28),dark);hoop.scale.set(.75,1.12,1);hoop.position.y=.53;grip.add(hoop);
 const strings=new THREE.Mesh(new THREE.CircleGeometry(.15,24),new THREE.MeshBasicMaterial({color:0xb9c5c8,transparent:true,opacity:.32,side:THREE.DoubleSide}));strings.scale.set(.75,1.12,1);strings.position.y=.53;grip.add(strings);return {grip,bind:grip.quaternion.clone()};
}
export function actorController(gltf,motion,scene){
 const model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);
 const bind=[];model.traverse(o=>{if(o.isBone)bind.push([o,o.quaternion.clone()])});const clips=bakeAnimationClips(model,motion);for(const [bone,q] of bind)bone.quaternion.copy(q);model.updateMatrixWorld(true);const actions=new Map();const mixer=new THREE.AnimationMixer(model);
 for(const clip of clips){const a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;actions.set(clip.name,a);}
 const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o)});const leftHand=model.getObjectByName('Bip01_L_Hand'),rightHand=model.getObjectByName('Bip01_R_Hand');if(!leftHand||!rightHand)throw Error('Player model does not have both hands');const racket=addRacket(rightHand);
 const originalPosition=model.position.clone();let active=null,previous=[],transition=1,step=0;
 function sample(name,time){const action=actions.get(name);if(!action)throw Error('Missing motion '+name);if(active!==name){previous=bones.map(b=>b.quaternion.clone());if(active)actions.get(active).stop();active=name;transition=0;action.reset().play();}action.time=clamp(time,0,action.getClip().duration);mixer.update(0);}
 function bend(name,axis,angle){const bone=model.getObjectByName(name);if(!bone)return;bone.updateWorldMatrix(true,false);const local=axis.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(local,angle));}
 function update(actor,match,dt){
  let name='forehand',time=0,serve=actor.side===match.score.server&&(['hold','toss'].includes(match.phase)||actor.pose==='serve'||actor.pose==='serve_left');
  if(serve){name='serve';time=match.phase==='hold'?0:match.phase==='toss'?Math.min(motion.clips.serve.contactTime,match.clock/.66*motion.clips.serve.contactTime):motion.clips.serve.contactTime+(.32-Math.max(0,actor.poseTime))*1.5;}
  else if(actor.pose==='forehand'||actor.pose==='backhand'||actor.pose==='lob'){
   name=actor.pose==='lob'?'overhead':actor.strokeVolley?(actor.pose==='backhand'?'volleyBackhand':'volleyForehand'):actor.pose;time=motion.clips[name].contactTime+(.32-Math.max(0,actor.poseTime))*1.5;
  }else if(match.phase==='flight'&&match.from!==actor.side&&((actor.side===1&&match.intent)||actor.side===-1)){
   const ball=match.ball,d=Math.hypot(ball.x-actor.x,ball.z-actor.z),near=clamp((4-d)/3,0,1);name=(ball.x-actor.x)*actor.side<0?'backhand':'forehand';time=motion.clips[name].contactTime*near;
  }
  sample(name,time);transition=Math.min(1,transition+Math.max(0,dt)/.13);if(transition<1)for(let i=0;i<bones.length;i++)bones[i].quaternion.slerpQuaternions(previous[i],bones[i].quaternion,transition);
  const speed=Math.hypot(actor.vx,actor.vz);if(!serve&&speed>.12&&actor.pose==='idle'){
   step+=dt*(5+speed*1.3);const amp=Math.min(1,speed/4)*.45;const sideways=Math.abs(actor.vx)>Math.abs(actor.vz);const axis=sideways?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);const phase=Math.sin(step);
   bend('Bip01_L_Thigh',axis,phase*amp);bend('Bip01_R_Thigh',axis,-phase*amp);bend('Bip01_L_Calf',new THREE.Vector3(1,0,0),Math.max(0,-phase)*amp*.7);bend('Bip01_R_Calf',new THREE.Vector3(1,0,0),Math.max(0,phase)*amp*.7);
  }
  const aim=serve?(actor.x<0?-.20:.20):0;model.rotation.y=(actor.side===1?Math.PI:0)+aim;model.position.set(actor.x,originalPosition.y,actor.z);model.updateMatrixWorld(true);
  racket.grip.quaternion.copy(racket.bind);if(actor.contactPoint&&actor.poseTime>.18){const handPos=rightHand.getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(actor.contactPoint.x,actor.contactPoint.y,actor.contactPoint.z).sub(handPos);if(target.length()>.05&&target.length()<1.1){const desired=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),target.normalize());desired.premultiply(rightHand.getWorldQuaternion(new THREE.Quaternion()).invert());racket.grip.quaternion.slerp(desired,clamp((actor.poseTime-.18)/.08,0,1));}}model.updateMatrixWorld(true);
 }
 return {model,update,hand(){return leftHand.getWorldPosition(new THREE.Vector3());}};
}
export async function createRiggedActors(scene){
 const [motion,a,b]=await Promise.all([fetch('./assets/mocap/strokes.json?v=18').then(r=>{if(!r.ok)throw Error('Motion data unavailable');return r.json()}),new GLTFLoader().loadAsync('./assets/mocap/athlete.glb?v=18'),new GLTFLoader().loadAsync('./assets/mocap/athlete.glb?v=18')]);
 return {player:actorController(a,motion,scene),cpu:actorController(b,motion,scene)};
}
