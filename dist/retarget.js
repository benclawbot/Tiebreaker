import * as THREE from './three.module.js';

// The BVH rig and the Biped rig use different local bone axes and bind poses.
// Map each Biped bone using a rest-frame correction in world space.
const map = {
 Hips:['Bip01_Pelvis','Chest','Bip01_Spine'], Chest:['Bip01_Spine2','Neck','Bip01_Neck'],
 Neck:['Bip01_Neck','Head','Bip01_Head'],
 LeftCollar:['Bip01_L_Clavicle','LeftShoulder','Bip01_L_UpperArm'],
 LeftShoulder:['Bip01_L_UpperArm','LeftElbow','Bip01_L_Forearm'],
 LeftElbow:['Bip01_L_Forearm','LeftWrist','Bip01_L_Hand'],
 RightCollar:['Bip01_R_Clavicle','RightShoulder','Bip01_R_UpperArm'],
 RightShoulder:['Bip01_R_UpperArm','RightElbow','Bip01_R_Forearm'],
 RightElbow:['Bip01_R_Forearm','RightWrist','Bip01_R_Hand'],
 LeftHip:['Bip01_L_Thigh','LeftKnee','Bip01_L_Calf'],
 LeftKnee:['Bip01_L_Calf','LeftAnkle','Bip01_L_Foot'],
 RightHip:['Bip01_R_Thigh','RightKnee','Bip01_R_Calf'],
 RightKnee:['Bip01_R_Calf','RightAnkle','Bip01_R_Foot'],
};
const unitY=new THREE.Vector3(0,1,0);
export function createRetargeter(scene,motion) {
 scene.updateMatrixWorld(true);
 const joints=motion.joints,index=Object.fromEntries(joints.map((j,i)=>[j.name,i]));
 const records=[];
 for(const [source,[targetName,sourceChild,targetChildName]] of Object.entries(map)) {
  const bone=scene.getObjectByName(targetName), child=scene.getObjectByName(targetChildName);
  if(!bone||!child||index[source]===undefined||index[sourceChild]===undefined)throw Error('Rig missing joint: '+source+' / '+targetName);
  const targetDir=child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
  const sourceDir=new THREE.Vector3(...joints[index[sourceChild]].offset).normalize();
  const correction=new THREE.Quaternion().setFromUnitVectors(targetDir,sourceDir).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  records.push({source:index[source],bone,correction});
 }
 // Remaining bones keep their bind rotations and are transformed by ancestors.
 const sourceWorld=joints.map(()=>new THREE.Quaternion());
 const invFirst=new Map();
 for(const [name,clip] of Object.entries(motion.clips)) {
  const q=new THREE.Quaternion().fromArray(clip.quaternions[0][0]);
  const facing=new THREE.Vector3(0,0,1).applyQuaternion(q); const yaw=Math.atan2(facing.x,facing.z);
  invFirst.set(name,new THREE.Quaternion().setFromAxisAngle(unitY,-yaw));
 }
 const q0=new THREE.Quaternion(),q1=new THREE.Quaternion(),desired=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 return {apply(name,time,heading=0){
  const clip=motion.clips[name];if(!clip)throw Error('Unknown clip: '+name);
  const n=clip.times.length;let f=Math.max(0,Math.min((n-1),time*motion.sampleRate));const a=Math.floor(f),b=Math.min(a+1,n-1),t=f-a;
  for(let i=0;i<joints.length;i++){
   q0.fromArray(clip.quaternions[a][i]);q1.fromArray(clip.quaternions[b][i]);q0.slerp(q1,t);
   if(joints[i].parent<0)sourceWorld[i].setFromAxisAngle(unitY,heading).multiply(invFirst.get(name)).multiply(q0);
   else sourceWorld[i].copy(sourceWorld[joints[i].parent]).multiply(q0);
  }
  for(const record of records){
   // Update intermediate, unmapped ancestors as well (Biped inserts spine bones).
   record.bone.parent.updateWorldMatrix(true,false);
   record.bone.parent.getWorldQuaternion(parentQ).invert();
   desired.copy(sourceWorld[record.source]).multiply(record.correction);
   record.bone.quaternion.copy(parentQ).multiply(desired).normalize();
   record.bone.updateWorldMatrix(false,true);
  }
  scene.updateMatrixWorld(true);
 }};
}

// Bake retargeted local bone rotations into Three.js clips. The renderer can
// cross-fade these clips without running the retargeter during gameplay.
export function bakeAnimationClips(scene,motion) {
 const rig=createRetargeter(scene,motion);
 const bones=[];scene.traverse(o=>{if(o.isBone)bones.push(o)});
 return Object.entries(motion.clips).map(([name,clip])=>{
  const tracks=bones.map(bone=>({bone,values:[]}));
  for(const time of clip.times){
   rig.apply(name,time);
   for(const {bone,values} of tracks)values.push(...bone.quaternion.toArray());
  }
  return new THREE.AnimationClip(name,clip.times.at(-1),tracks.map(({bone,values})=>
   new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,clip.times,values)));
 });
}
