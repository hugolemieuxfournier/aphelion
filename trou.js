// The opening of Aphelion: Gargantua, ray-traced in the browser (the app's own intro shader, bbox-003).
// The camera pulls out of the disk, as in the app, then keeps orbiting slowly.
(() => {
  const cv = document.getElementById('trou');
  if (!cv) return;
  const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return;
  const FRAG = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 uR;uniform vec2 uC;uniform float uT;uniform float uS;uniform float uV;uniform float uF;uniform float uZ;uniform float uDist;uniform float uEl;uniform float uExp;
  float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  const float PI=3.14159265;
  const float RIN=6.;           // innermost stable circular orbit
  const float ROUT=20.;         // outer edge of the disk (with FOC: the whole disk fits the width of a phone in portrait)
  const float FOC=1.2;          // focal length (units of the screen's short side): ROUT/56·FOC ≈ .43 < half the width
  const float SPIN=6.;           // units of M-time per second for the gas (how fast it turns)
  const int STEPS=150;
  // sharp round stars on the sky sphere, antialiased over one pixel (pa = angle of a pixel)
  float stars(vec3 d,float k,float th,float pa){
    vec2 g=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*k/PI;vec2 id=floor(g);vec2 f=fract(g)-.5;float hs=h(id);
    vec2 off=(vec2(h(id+3.1),h(id+7.7))-.5)*.7;float dd=length(f-off)*PI/k;
    float sz=pa*mix(.45,1.1,h(id+1.3));
    return step(th,hs)*exp(-dd*dd/(sz*sz))*mix(.35,1.,h(id+5.9));}
  // the disk's light at radius r, angle a: hot inner edge, turbulent gas turning at the Keplerian rate, lit inside out
  vec4 disk(float r,float a){
    float m=smoothstep(RIN,RIN*1.06,r)*smoothstep(ROUT,ROUT*.6,r);
    float ph=a+pow(r,-1.5)*uT*SPIN;
    vec2 cs=vec2(cos(ph),sin(ph));
    float tex=.55+.45*fbm(vec2(r*1.15,0.)+cs*3.2);
    tex*=.9+.1*sin(r*7.+fbm(cs*2.+r*.4)*5.);
    float x=(r-RIN)/(ROUT-RIN);
    float prof=pow(RIN/r,2.4)*pow(max(0.,1.-sqrt(RIN*.97/r)),.35)*2.6;
    float g=sqrt(max(0.,1.-3./r));
    vec3 hot=vec3(1.,.96,.88),gold=vec3(1.,.68,.3),amber=vec3(.72,.3,.08);
    vec3 c=mix(hot,gold,smoothstep(0.,.3,x));c=mix(c,amber,smoothstep(.25,1.,x));
    float lit=smoothstep(0.,.25,uV*1.25-x*.9);
    return vec4(c*tex*prof*g*g*lit*m*4.2,m*.93);}
  void main(){
    float s=min(uR.x,uR.y);vec2 p=(gl_FragCoord.xy-uC)/s;
    // the camera: orbiting the hole (~8° a second), at the distance and elevation the timeline sets
    // (the orbit is what makes the starfield stream through the lens, as in the film: stars slide towards the
    // Einstein ring, split in two images and wrap around the shadow)
    float az=.6+uT*.14,el=uEl,D=uDist;
    vec3 C=D*vec3(sin(az)*cos(el),sin(el),cos(az)*cos(el));
    vec3 fw=normalize(-C),rt=normalize(cross(fw,vec3(0,1,0))),up=cross(rt,fw);
    vec3 v=normalize(fw*FOC*uZ+rt*p.x+up*p.y),x=C;
    float pa=1./(s*FOC*uZ);
    vec3 L=cross(x,v);float h2=dot(L,L);
    vec3 col=vec3(0.);float al=0.,glow=0.;bool fell=false;float RMAX=max(D,ROUT)*1.25;
    for(int i=0;i<STEPS;i++){
      float r=length(x);
      if(r<2.02){fell=true;break;}
      if(r>RMAX&&dot(x,v)>0.)break;
      float dt=clamp(.08*r,.04,4.);
      vec3 a=-1.5*h2*x/pow(r,5.);
      vec3 xn=x+v*dt+.5*a*dt*dt;
      vec3 an=-1.5*h2*xn/pow(length(xn),5.);
      v+=.5*(a+an)*dt;
      if(x.y*xn.y<0.){
        vec3 xc=mix(x,xn,x.y/(x.y-xn.y));float rc=length(xc.xz);
        if(rc>RIN&&rc<ROUT){vec4 e=disk(rc,atan(xc.z,xc.x));col+=(1.-al)*e.rgb;al+=(1.-al)*e.a;}
      }
      // a faint light scattered around the disk plane, from the hot inner region
      float rr=length(x.xz);
      glow+=exp(-abs(x.y)*1.2)*smoothstep(RIN*.9,RIN*1.3,rr)*pow(RIN/max(rr,RIN),2.)*dt*.012;
      x=xn;
      if(al>.995)break;
    }
    vec3 d=normalize(v);
    if(!fell)col+=(1.-al)*vec3(.95,.93,1.)*uS*(stars(d,90.,.925,pa*1.1)+stars(d.zxy,150.,.955,pa*.8)*.55);
    col+=vec3(1.,.72,.4)*glow*smoothstep(.1,.9,uV)*(1.+1.5*uF);
    // the flare of the chord: a thin horizontal streak through the hole, and a short bloom
    float r0=length(p);
    col+=vec3(1.,.85,.65)*exp(-r0*r0/.06)*.18*uF;
    col+=vec3(1.,.9,.78)*exp(-abs(p.y)/(1.6/s+.0015))*exp(-abs(p.x)*1.6)*(.06*uV+.4*uF);
    col=1.-exp(-col*1.35*uExp);
    gl_FragColor=vec4(col,1.);}
`;
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
  const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!v || !f) return;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uR', 'uC', 'uT', 'uS', 'uV', 'uF', 'uZ', 'uDist', 'uEl', 'uExp'].forEach(k => U[k] = gl.getUniformLocation(pr, k));
  // the app's timeline (intro.ts, take « sortie »)
  const LOIN = 56, PRES = 2.3, EL = .075, ACCORD = 4.5;
  const lisse = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const chrono = e => {
    const eclat = lisse(4.2, 4.5, e) * Math.exp(-Math.max(0, e - ACCORD) * 1.4);
    const x = Math.min(1, Math.max(0, (e - .3) / (ACCORD - .3))), k = 1 - Math.pow(1 - x, 2.2);
    const drift = Math.min(Math.max(0, e - ACCORD), 14);
    const distance = PRES * Math.pow(LOIN / PRES, k) * (1 + .012 * drift);
    const elevation = EL + .65 * lisse(28, 3, distance) + .004 * drift;
    return { etoiles: lisse(0, 1.2, e), revele: lisse(.2, 2.8, e), eclat, distance, elevation, exposition: Math.min(1, Math.pow(distance / LOIN, .42)) };
  };
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // resolution: the ray tracer is heavy; it adapts to keep the page smooth
  let echelle = Math.min(window.devicePixelRatio || 1, 2) * (innerWidth > 900 ? .55 : .75), W = 0, H = 0;
  const taille = () => {
    const w = Math.round(cv.clientWidth * echelle), h = Math.round(cv.clientHeight * echelle);
    if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; gl.viewport(0, 0, W, H); }
  };
  let t0 = performance.now(), visible = true, lents = 0, dernier = 0, raf = 0;
  const image = now => {
    raf = 0;
    if (!visible) return;
    const dt = now - dernier; dernier = now;
    if (dt > 40 && dt < 400 && ++lents > 20 && echelle > .3) { echelle *= .8; lents = 0; }
    taille();
    const e = calme ? 9 : (now - t0) / 1000, c = chrono(e);
    gl.uniform2f(U.uR, W, H); gl.uniform2f(U.uC, W / 2, H * (W > H * 1.2 ? .67 : .56));
    gl.uniform1f(U.uT, e); gl.uniform1f(U.uS, c.etoiles); gl.uniform1f(U.uV, c.revele); gl.uniform1f(U.uF, c.eclat);
    gl.uniform1f(U.uZ, 1); gl.uniform1f(U.uDist, c.distance); gl.uniform1f(U.uEl, c.elevation); gl.uniform1f(U.uExp, c.exposition);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!cv.classList.contains('vu')) cv.classList.add('vu');
    if (!calme) raf = requestAnimationFrame(image);
  };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { dernier = performance.now(); raf = requestAnimationFrame(image); } }).observe(cv);
  addEventListener('resize', () => { if (calme && visible) requestAnimationFrame(image); });
  raf = requestAnimationFrame(image);
})();
