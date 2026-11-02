/** Camera fits to the provided 762×506 court images (metres and degrees). */
export const VENUES={
 hard:{height:4.789,z:26.111,pitch:9.832,fov:27.911},
 clay:{height:4.713,z:26.547,pitch:8.970,fov:27.877},
 grass:{height:5.308,z:27.905,pitch:9.476,fov:27.596},
 indoor:{height:5.275,z:28.437,pitch:9.267,fov:26.863}
};
export function venueCrop(width,height){
 const imageWidth=762,imageHeight=506,ratio=width/height;
 if(ratio>=imageWidth/imageHeight){const h=imageWidth/ratio;const top=Math.max(0,Math.min(imageHeight-h,320-h/2));return {x:0,y:top,width:imageWidth,height:h,position:`50% ${imageHeight===h?50:top/(imageHeight-h)*100}%`};}
 const w=imageHeight*ratio;return {x:(imageWidth-w)/2,y:0,width:w,height:imageHeight,position:'50% 50%'};
}
export function projectVenue(c,x,y,z){const a=c.pitch*Math.PI/180,f=253/Math.tan(c.fov*Math.PI/360),d=(c.z-z)*Math.cos(a)+(c.height-y)*Math.sin(a),v=(c.z-z)*Math.sin(a)+(y-c.height)*Math.cos(a);return {x:381+f*x/d,y:253-f*v/d};}

/** Keep the manually controlled player within the visible photo-court. */
export function visibleHumanBounds(c,crop,playerZ){
 const bottom=crop.y+crop.height-18;let lo=13,hi=17;
 for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(projectVenue(c,0,0,mid).y<=bottom)lo=mid;else hi=mid;}
 const z=Math.min(playerZ,lo),center=projectVenue(c,0,0,z),unit=projectVenue(c,1,0,z);
 const half=Math.min(center.x-crop.x,crop.x+crop.width-center.x)-25;
 return {maxZ:Math.max(13,Math.min(17,lo)),maxX:Math.max(4.2,Math.min(6.7,half/(unit.x-center.x)))};
}
