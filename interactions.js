const progress=document.querySelector('.reading-progress');
let pending=false,manual=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hero=document.querySelector('.hero'),panel=document.querySelector('.viewer-panel'),auren=document.querySelector('#auren'),motionSections=document.querySelectorAll('.section,.project-feature');
const caption=document.createElement('p');caption.className='scene-caption';caption.textContent='Scroll to explore the assembly. Drag at any time to inspect.';document.querySelector('.model-presets').after(caption);
const resume=document.createElement('button');resume.type='button';resume.className='resume-tour';resume.textContent='Resume scroll tour';resume.hidden=true;caption.after(resume);
function stopTour(){manual=true;resume.hidden=reduced.matches;caption.textContent='Manual inspection. Your view stays under your control.'}
panel.addEventListener('pointerdown',e=>{if(e.target!==resume)stopTour()});panel.addEventListener('keydown',e=>{if(e.target!==resume&&e.key!=='Tab')stopTour()});document.querySelector('#cad-stage').addEventListener('wheel',stopTour,{passive:true});
resume.onclick=()=>{manual=false;resume.hidden=true;updateProgress()};
function updateProgress(){
 const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?scrollY/max:0})`;
 const hr=hero.getBoundingClientRect();
 if(!reduced.matches){
  const t=Math.max(0,Math.min(1,-hr.top/(hr.height*.62)));
  panel.style.setProperty('--hero-shift',`${Math.min(24,t*24)}px`);
  if(!manual&&hr.bottom>80&&hr.top<innerHeight&&window.__cad?.tour){window.__cad.tour(t);caption.textContent=t<.25?'01 / Geometry and placement':t<.65?'02 / Components separate as you scroll':'03 / How the parts fit together';presets.forEach(b=>b.setAttribute('aria-pressed','false'))}
  motionSections.forEach(el=>{const r=el.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight){const v=Math.max(-1,Math.min(1,(r.top-innerHeight*.25)/innerHeight));el.style.setProperty('--section-shift',`${v*18}px`);el.style.setProperty('--model-shift',`${-v*22}px`)}});
  const ar=auren.getBoundingClientRect();if(ar.bottom>0&&ar.top<innerHeight){auren.style.setProperty('--orbit-y',`${Math.max(-18,Math.min(18,ar.top*.035))}px`);auren.style.setProperty('--orbit-angle',`${-25+Math.max(-40,Math.min(40,ar.top*.06))}deg`)}
 }
 pending=false;
}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(updateProgress)}},{passive:true});
addEventListener('resize',updateProgress);addEventListener('cadready',updateProgress);reduced.addEventListener('change',()=>{resume.hidden=reduced.matches||!manual;updateProgress()});
const presets=document.querySelectorAll('[data-preset]');
presets.forEach(button=>button.addEventListener('click',()=>{
 const explode=document.querySelector('#explode'),component=document.querySelector('#component');
 if(explode.disabled||component.disabled)return;
 explode.value=button.dataset.preset==='exploded'?'65':'0';component.value=button.dataset.preset==='adjuster'?'adjuster':'all';
 explode.dispatchEvent(new Event('input',{bubbles:true}));component.dispatchEvent(new Event('change',{bubbles:true}));
 const shift=document.querySelector('#shift');if(shift){shift.value=button.dataset.preset==='adjuster'?'14':'0';shift.dispatchEvent(new Event('input',{bubbles:true}))}
 presets.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
['#explode','#component','#shift'].forEach(selector=>document.querySelector(selector).addEventListener('input',e=>{if(e.isTrusted)presets.forEach(b=>b.setAttribute('aria-pressed','false'))}));
// Keep the project list easy to scan while preserving native disclosure controls.
document.querySelectorAll('.ai-project').forEach(detail=>detail.addEventListener('toggle',()=>{
 if(detail.open)document.querySelectorAll('.ai-project').forEach(other=>{if(other!==detail)other.open=false});
}));
const currentLinks=document.querySelectorAll('.header nav a[href^="#"]');
const sectionObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){currentLinks.forEach(link=>{if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')})}},{rootMargin:'-10% 0px -65% 0px'});
document.querySelectorAll('#work,#experience,#auren,#about').forEach(section=>sectionObserver.observe(section));
const orbObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{entry.target.classList.toggle('is-visible',entry.isIntersecting);if(!entry.isIntersecting)entry.target.classList.remove('is-reacting')})});orbObserver.observe(auren);
let reaction;
auren.addEventListener('click',e=>{if(!e.target.closest('.demo-controls button')||reduced.matches)return;auren.classList.remove('is-reacting');requestAnimationFrame(()=>auren.classList.add('is-reacting'));clearTimeout(reaction);reaction=setTimeout(()=>auren.classList.remove('is-reacting'),2300)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){auren.classList.remove('is-visible','is-reacting')}else{const r=auren.getBoundingClientRect();auren.classList.toggle('is-visible',r.bottom>0&&r.top<innerHeight);updateProgress()}});
updateProgress();

