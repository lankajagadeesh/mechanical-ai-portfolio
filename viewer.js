import * as THREE from 'three';
import {OrbitControls} from './assets/OrbitControls.js';
import {RoomEnvironment} from './assets/RoomEnvironment.js';

const stage=document.querySelector('#cad-stage');
const loading=document.querySelector('#cad-loading');
const description=document.querySelector('#component-description');
document.querySelectorAll('.viewer-controls button,.assembly-controls input,.assembly-controls select,.model-presets button').forEach(c=>c.disabled=true);
const info={all:'22 simplified STEP solids. Original proportions and placements.',plate:'6061-T6 plate, 260 × 180 × 10 mm. Four guided slots provide 20 mm design travel.',adjuster:'The right-side M10 adjustment screw pushes the plate left to increase pulley spacing.',frame:'Base plate, support rails and side guides support and guide the moving plate.',motor:'Simplified motor and mounting-foot envelopes. These are not supplier-detail models.',drive:'Drive and driven pulley pitch radii: 40 and 60 mm. Nominal centre distance: 360 mm.',hardware:'Four simplified clamp screws and washers lock the plate. Threads are not modelled.'};
try {
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,1,6000);camera.up.set(0,0,1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=340;controls.maxDistance=1800;controls.maxPolarAngle=Math.PI*.89;
 const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.02).texture;env.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe4efff,0x293849,3));const light=new THREE.DirectionalLight(0xd5e7ff,3);light.position.set(100,-250,650);scene.add(light);
 const fill=new THREE.DirectionalLight(0x769dff,1.8);fill.position.set(-300,200,250);scene.add(fill);
 const model=new THREE.Group();scene.add(model);const meshes=[];
 const colours={plate:0xb9cee6,frame:0x53667e,motor:0x263951,drive:0x7f9bb9,hardware:0xd2dce8,adjuster:0x6b9fdc};
 const response=await fetch('./assets/assembly.json');if(!response.ok)throw new Error('CAD unavailable');const data=await response.json();
 for(const part of data.solids){let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geometry.setIndex(part.indices);geometry=geometry.toNonIndexed();geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:colours[part.group],metalness:.72,roughness:.3,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.userData=part;model.add(mesh);meshes.push(mesh);
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,28),new THREE.LineBasicMaterial({color:0x17283e,transparent:true,opacity:.32}));mesh.add(edges);
 }
 const belt=new THREE.Group();const a=20/360;
 for(const sign of [-1,1]){const nx=-a,nz=sign*Math.sqrt(1-a*a);const points=[new THREE.Vector3(40*nx,85,85+40*nz),new THREE.Vector3(360+60*nx,85,85+60*nz)];belt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0x70a8ff,dashSize:7,gapSize:4})));}
 belt.children.forEach(l=>l.computeLineDistances());scene.add(belt);
 const grid=new THREE.GridHelper(850,34,0x3b5777,0x293c53);grid.rotation.x=Math.PI/2;grid.position.set(110,0,-34);grid.material.transparent=true;grid.material.opacity=.32;scene.add(grid);
 function draw(){renderer.render(scene,camera)}
 function fitProjection(){camera.zoom=Math.min(1.15,Math.max(.4,camera.aspect*.8));camera.updateProjectionMatrix()}
 function reset(){controls.target.set(115,15,25);camera.position.set(560,-690,440);fitProjection();controls.update();draw()}
 function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;fitProjection();draw()}
 stage.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');document.querySelector('#cad-fallback').hidden=true;loading.hidden=true;stage.dataset.loaded='true';stage.dataset.solids=data.solids.length;
 new ResizeObserver(resize).observe(stage);controls.addEventListener('change',draw);reset();resize();
 const offsets={plate:45,frame:0,motor:125,drive:85,hardware:80,adjuster:20};
 document.querySelector('#explode').addEventListener('input',e=>{const amount=Number(e.target.value)/100;for(const mesh of meshes){mesh.position.z=offsets[mesh.userData.group]*amount;if(mesh.userData.name==='Base plate')mesh.position.z=-45*amount;}belt.visible=amount===0;draw()});
 document.querySelector('#component').addEventListener('change',e=>{const group=e.target.value;for(const mesh of meshes){const selected=group==='all'||mesh.userData.group===group;mesh.material.opacity=selected?1:.16;mesh.material.transparent=!selected;mesh.material.depthWrite=selected;mesh.material.emissive.setHex(selected&&group!=='all'?0x183b69:0);mesh.children[0].visible=selected;}description.textContent=info[group];draw()});
 document.querySelector('#reset-view').addEventListener('click',reset);
 document.querySelector('#top-view').addEventListener('click',()=>{controls.target.set(115,0,0);camera.position.set(115,-.1,920);controls.update();draw()});
 document.querySelector('#front-view').addEventListener('click',()=>{controls.target.set(115,0,25);camera.position.set(115,-960,25);controls.update();draw()});
 function zoom(factor){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(factor);offset.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();draw()}
 document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.85));document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1.15));
 stage.addEventListener('keydown',e=>{if(e.key==='r'||e.key==='R')reset();else if(e.key==='+'||e.key==='=')zoom(.85);else if(e.key==='-')zoom(1.15);else if(e.key.startsWith('Arrow')){const off=camera.position.clone().sub(controls.target);if(e.key==='ArrowLeft'||e.key==='ArrowRight')off.applyAxisAngle(new THREE.Vector3(0,0,1),e.key==='ArrowLeft'?.12:-.12);else {off.z+=e.key==='ArrowUp'?35:-35;}camera.position.copy(controls.target).add(off);controls.update();draw();}else return;e.preventDefault()});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#cad-fallback').hidden=false;renderer.domElement.hidden=true;loading.hidden=false;loading.textContent='3D paused. Still view shown. Reload to try again.';document.querySelectorAll('.viewer-controls button,.assembly-controls input,.assembly-controls select,.model-presets button').forEach(c=>c.disabled=true)});
 document.querySelectorAll('.viewer-controls button,.assembly-controls input,.assembly-controls select,.model-presets button').forEach(c=>c.disabled=false);
 function tour(t){if(document.querySelector('#explode').disabled)return;controls.target.set(115,15,25);camera.position.set(560-t*135,-690+t*70,440+t*80);const amount=Math.max(0,Math.min(.55,(t-.2)*.85));for(const mesh of meshes){mesh.position.z=offsets[mesh.userData.group]*amount;if(mesh.userData.name==='Base plate')mesh.position.z=-45*amount;mesh.material.opacity=1;mesh.material.transparent=false;mesh.material.depthWrite=true;mesh.material.emissive.setHex(0);mesh.children[0].visible=true}belt.visible=amount===0;document.querySelector('#explode').value=String(Math.round(amount*100));document.querySelector('#component').value='all';description.textContent=info.all;controls.update();draw()}
 window.__cad={camera,controls,meshes,renderer,draw,reset,tour};dispatchEvent(new Event('cadready'));
}catch(error){loading.textContent='Still view shown. Interactive 3D is unavailable in this browser.';for(const control of document.querySelectorAll('.viewer-controls button,.assembly-controls input,.assembly-controls select,.model-presets button'))control.disabled=true;stage.dataset.loaded='fallback';console.warn('Using CAD still view:',error.message)}

