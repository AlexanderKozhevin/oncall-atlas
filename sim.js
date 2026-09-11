(()=>{'use strict';
const M=DispatchSim,$=id=>document.getElementById(id),days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
let state=M.createState(),finished=new Set(),timer=null,toastTimer,scene,world;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusText={firing:'Ждёт ответа',ack:'В работе',resolved:'Решён',queued:'В очереди'};
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function change(fn,notify=false){const before=state.log[0];fn();if(notify&&state.log[0]!==before)toast(state.log[0].text);render();}
function stop(){clearInterval(timer);timer=null;$('play').textContent='▶ Время';$('play').setAttribute('aria-pressed','false');$('time-note').textContent='На паузе';}
function startMission(id){stop();state=M.createState(id);$('assign-start').value='09:00';$('assign-end').value=id==='slots'?'18:00':'16:00';render();scene?.resetTokens();}
function choosePerson(id){const p=M.people.find(x=>x.id===id);if(!p)return;if(p.team==='dispatch'){toast('Мира — общий пост: принимает до двух сигналов и передаёт их экспертам.');return;}state.selectedPerson=id;state.selectedTeam=p.team;render();}
function render(){
 const m=M.missions.find(x=>x.id===state.mission),c=M.clock(state),sel=M.selected(state),t=M.teams.find(x=>x.id===state.selectedTeam),covered=M.coverage(state,t.id);
 if(M.complete(state)){finished.add(state.mission);stop();}
 $('progress-count').textContent=finished.size+' / 6';
 $('mission-list').innerHTML=M.missions.map((x,i)=>`<button class="mission-button ${x.id===state.mission?'active':''} ${finished.has(x.id)?'done':''}" data-mission="${x.id}" aria-current="${x.id===state.mission?'step':'false'}"><span class="num">${finished.has(x.id)?'✓':i===6?'∞':String(i+1).padStart(2,'0')}</span><span><b>${x.title}</b><small>${['Принять и решить','Закрыть окно отсутствия','Передать ответственность','Не пропустить покрытие','Назначать явные смены','Проверить ёмкость поста','Ваши правила, ваши сбои'][i]}</small></span></button>`).join('');
 $('mission-tag').textContent=m.tag;$('mission-title').textContent=m.title;$('mission-description').textContent=m.description;
 $('steps').innerHTML=m.steps.map(([k,label],i)=>`<span class="step ${state.flags[k]?'checked':''}"><b>${state.flags[k]?'✓':i+1}</b>${label}</span>`).join('')||'<span class="step">∞ Свободный режим · всё можно менять</span>';
 $('complete-banner').hidden=!M.complete(state);$('complete-lesson').textContent=m.lesson;
 $('clock').textContent=days[c.day%7]+' · '+M.fmt(c.hour);$('calendar-note').textContent='Каждый день в '+M.fmt(c.hour);
 $('holiday').checked=state.holiday;$('weekend').checked=state.weekend;$('delivery').checked=state.delivery;$('architecture').value=state.architecture;
 $('architecture-note').textContent=state.architecture==='rotation'?'Замена → подходящий слой → очередь. Недоступность сама не выбирает другого человека.':state.architecture==='shifts'?'Предложение: ответственность хранится в явных временных окнах.':'Предложение: общий пост принимает 2 сигнала. Остальные ждут, пока освободится место.';
 $('event-buttons').innerHTML=M.teams.map(t=>`<button data-spawn="${t.id}" aria-label="Запустить сбой ${t.service}">+ ${t.service}</button>`).join('');
 $('team-tabs').innerHTML=M.teams.map(x=>`<button class="${t.id===x.id?'active':''}" data-team="${x.id}" aria-pressed="${t.id===x.id}">${x.name}</button>`).join('');
 $('coverage').innerHTML=`Сейчас: <b>${M.name(covered.person)}</b><br><span>${esc(covered.source)}</span>`;
 const pp=M.people.filter(p=>p.team===t.id);if(!pp.some(p=>p.id===state.selectedPerson))state.selectedPerson=pp[0].id;
 $('people').innerHTML=pp.map(p=>`<button class="person ${p.id===state.selectedPerson?'active':''} ${state.absent[p.id]?'sick':''}" draggable="true" data-person="${p.id}" aria-label="Выбрать ${p.name}"><span class="avatar">${p.name[0]}</span>${p.name}<small>${state.absent[p.id]?'Больничный':!M.available(state,p.id)?'Занят(а)':covered.person===p.id?'На дежурстве':'Доступен(на)'}</small></button>`).join('');
 $('person-actions').innerHTML=`<button id="sick-toggle">${state.absent[state.selectedPerson]?'Вернуть на работу':'На больничный'} · ${M.name(state.selectedPerson)}</button><button id="busy-toggle">${state.busy[state.selectedPerson]?'Освободить':'Занять другой задачей'}</button>`;
 $('assign-person').innerHTML=pp.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');$('assign-person').value=state.selectedPerson;
 $('assign-submit').textContent=state.architecture==='shifts'?'Подтвердить смену':'Подтвердить замену';
 const list=state.architecture==='shifts'?state.slots:state.overrides;
 $('assignments').innerHTML=list.map((a,i)=>({a,i})).filter(({a})=>a.team===t.id&&a.day===c.day).map(({a,i})=>`<div><span>${M.name(a.person)} · ${M.fmt(a.start)}–${M.fmt(a.end)}</span><button data-remove="${i}" aria-label="Удалить назначение ${M.name(a.person)}">Удалить</button></div>`).join('');
 const baseWeek=Math.floor(c.day/7)*7;
 $('calendar').innerHTML='<div class="calrow heading"><span>Команда</span>'+days.map((d,i)=>`<span style="text-align:center">${d}${i===c.day%7?' ●':''}</span>`).join('')+'</div>'+M.teams.map(t=>'<div class="calrow"><strong>'+t.name+'</strong>'+days.map((d,j)=>{const v=M.coverage({...state,day:baseWeek+j,hour:c.hour,minute:0},t.id);return `<button class="daycell ${v.kind} ${c.day===baseWeek+j?'now':''}" data-day="${baseWeek+j}" title="${esc(v.source)}">${M.name(v.person)}</button>`;}).join('')+'</div>').join('');
 $('incident-count').textContent=state.incidents.filter(i=>i.status!=='resolved').length;
 $('incident-list').innerHTML=state.incidents.length?state.incidents.map(i=>`<button data-incident="${i.id}" class="incident-btn ${i.id===state.selected?'selected':''} ${i.status}"><b>#${i.id} · ${M.teams.find(t=>t.id===i.team).service}</b><small>${statusText[i.status]} · ${M.name(i.owner)} · ${state.minute-i.created} мин</small></button>`).join(''):'<p class="empty">Пока тихо.<br>Начните с первого учебного сбоя.</p><button data-spawn="api" class="primary">Начать: сбой API →</button>';
 if(sel){
  const can=M.available(state,sel.owner,sel.id);
  $('incident-detail').innerHTML=`<div class="detail"><span class="detail-label">ВЛАДЕЛЕЦ ИНЦИДЕНТА #${sel.id}</span><h4>${M.name(sel.owner)}</h4><p>${sel.status==='queued'?'Ожидает свободного места на общем посту.':sel.status==='resolved'?'Сервис восстановлен.':sel.status==='ack'?'Эскалация остановлена. Проблема в работе.':!can?'Человек сейчас недоступен. Нужен другой адресат.':sel.next==null?'Маршрут исчерпан. Нужен ручной разбор.':'Следующий шаг через '+Math.max(0,sel.next-state.minute)+' мин.'}</p><p>${sel.status==='queued'?'◷ Уведомление ожидает назначения':!sel.owner?'○ Нет адресата для уведомления':sel.delivered?'● Уведомление доставлено':'× Уведомление не доставлено'}</p>${sel.post?'<div class="route"><span class="active">Общий пост</span><span>Эксперт команды</span></div>':'<div class="route">'+sel.route.map((p,j)=>`<span class="${sel.stage===j?'active':''}">${M.name(p)}<br>${[0,5,15][j]} мин</span>`).join('')+'</div>'}<div class="incident-actions"><button id="ack" class="ack-button" ${sel.status!=='firing'||!can?'disabled':''}>Принять · ACK</button><button id="resolve" ${sel.status!=='ack'||sel.owner==='mira'?'disabled':''}>Решить ✓</button><button id="reroute" class="wide" ${!['firing','ack'].includes(sel.status)?'disabled':''}>${sel.owner==='mira'?'Передать профильной команде':'Переназначить по покрытию'}</button></div></div>`;
 }else $('incident-detail').innerHTML='';
 let explanation=m.lesson;
 if(sel?.status==='firing'&&!M.available(state,sel.owner,sel.id))explanation='В расписании человек есть, но фактически он недоступен. Система не узнаёт о больничном автоматически. Назначьте свободного коллегу на нужное окно, затем передайте ему открытый сигнал.';
 if(sel?.status==='ack')explanation='Ответ получен. Таймер передачи остановился, но сервис ещё не восстановлен. Следующее осмысленное действие — устранить проблему и нажать «Решить».';
 if(state.holiday)explanation+=' Метка праздника включена; день недели и очередь остались прежними.';
 $('mentor-text').textContent=explanation;$('guide-link').href=m.guide;
 $('log').innerHTML=state.log.map(e=>`<li class="${e.type}"><time>+${e.minute} мин</time>${esc(e.text)}</li>`).join('');
 scene?.sync();
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.mission)return startMission(d.mission);
 if(d.team){state.selectedTeam=d.team;return render();}
 if(d.person)return choosePerson(d.person);
 if(d.spawn)return change(()=>M.spawn(state,d.spawn),true);
 if(d.incident){state.selected=Number(d.incident);state.selectedTeam=M.selected(state).team;return render();}
 if(d.day){stop();const c=M.clock(state);state.day=Number(d.day);state.hour=c.hour;state.minute=0;state.incidents=[];state.selected=null;M.log(state,'Открыт другой день. Инциденты текущего прогона сброшены.');state.flags={};return render();}
 if(d.remove){const list=state.architecture==='shifts'?state.slots:state.overrides;list.splice(Number(d.remove),1);M.log(state,'Назначение удалено. Проверьте, кто теперь покрывает окно.');return render();}
 if(b.id==='restart')startMission(state.mission);
 if(b.id==='next-mission'){const idx=M.missions.findIndex(m=>m.id===state.mission);startMission(M.missions[Math.min(idx+1,6)].id);}
 if(b.id==='step')change(()=>M.step(state),true);
 if(b.id==='day-next'){stop();state.day=M.clock(state).day+1;state.hour=9;state.minute=0;state.incidents=[];state.selected=null;state.flags={};M.log(state,'Новый день. Очередь сдвинулась по календарю.');render();}
 if(b.id==='play'){if(timer)stop();else{b.textContent='Ⅱ Пауза';b.setAttribute('aria-pressed','true');$('time-note').textContent='1 сек = 1 мин';timer=setInterval(()=>change(()=>M.step(state,1)),1000);}}
 if(b.id==='ack')change(()=>M.ack(state),true);
 if(b.id==='resolve')change(()=>M.resolve(state),true);
 if(b.id==='reroute')change(()=>M.selected(state)?.owner==='mira'?M.handoff(state):M.reroute(state),true);
 if(b.id==='sick-toggle')change(()=>{state.absent[state.selectedPerson]=!state.absent[state.selectedPerson];M.log(state,`${M.name(state.selectedPerson)}: ${state.absent[state.selectedPerson]?'больничный. Календарь пока не изменён.':'снова доступен(на).'}`,'warn');},true);
 if(b.id==='busy-toggle')change(()=>{state.busy[state.selectedPerson]=!state.busy[state.selectedPerson];M.log(state,`${M.name(state.selectedPerson)}: ${state.busy[state.selectedPerson]?'занят(а) другой задачей':'задача снята'}.`);},true);
 if(b.id==='map-help')toast('Нажмите на человека, чтобы менять доступность. Перетащите его жетон к своей команде и подтвердите окно ниже. Сбой запускается кнопками + API / База данных / Сеть.');
 if(b.id==='log-toggle'){const hidden=$('log').hidden=!$('log').hidden;b.textContent=hidden?'Показать':'Свернуть';b.setAttribute('aria-expanded',String(!hidden));}
 if(b.id==='films-open'){$('media-dialog').showModal();stop();}
 if(b.id==='films-close')$('media-dialog').close();
 if(d.film){$('film-player').pause();$('film-player').src='video/0'+d.film+'.mp4?v=2';$('film-player').poster='video/0'+d.film+'.jpg?v=2';document.querySelectorAll('[data-film]').forEach(x=>x.classList.toggle('active',x===b));$('transcript').href='audio/0'+d.film+'.txt';}
});
['holiday','weekend','delivery'].forEach(id=>$(id).addEventListener('change',()=>change(()=>{state[id]=$(id).checked;if(id==='holiday'){state.flags.holidayMarked=state.holiday;M.log(state,'Праздничная метка изменена. Покрытие не меняется автоматически.');}else M.log(state,id==='delivery'?'Доставка уведомлений '+(state.delivery?'включена.':'выключена. Назначение всё равно может состояться.'):'Слой выходных '+(state.weekend?'включён.':'выключен.'));},true)));
 $('architecture').addEventListener('change',()=>change(()=>M.setArchitecture(state,$('architecture').value),true));
 $('assign-person').addEventListener('change',()=>{state.selectedPerson=$('assign-person').value;render();});
 $('assign-form').addEventListener('submit',e=>{e.preventDefault();const h=v=>{const[a,b]=v.split(':').map(Number);return a+b/60;};change(()=>M.assign(state,{team:state.selectedTeam,person:$('assign-person').value,start:h($('assign-start').value),end:h($('assign-end').value),kind:state.architecture==='shifts'?'shift':'override'}),true);});
 document.addEventListener('dragstart',e=>{const p=e.target.closest('[data-person]');if(p)e.dataTransfer.setData('text/plain',p.dataset.person);});
 $('team-tabs').addEventListener('dragover',e=>e.preventDefault());$('team-tabs').addEventListener('drop',e=>{e.preventDefault();const p=e.dataTransfer.getData('text/plain'),t=e.target.closest('[data-team]');if(t)prepareDrop(p,t.dataset.team);});
 function prepareDrop(person,team){const p=M.people.find(p=>p.id===person);if(!p)return;if(p.team!==team)return toast('Для этой учебной замены нужен специалист выбранной команды.');choosePerson(person);toast('Выбран(а) '+M.name(person)+'. Укажите время и нажмите «Подтвердить».');$('assign-form').scrollIntoView({block:'nearest',behavior:'smooth'});}
 $('audio-chapter').addEventListener('change',()=>{$('guide-audio').src='audio/'+$('audio-chapter').value+'.mp3?v=2';$('transcript').href='audio/'+$('audio-chapter').value+'.txt';});
 $('film-player').addEventListener('play',()=>$('guide-audio').pause());$('guide-audio').addEventListener('play',()=>$('film-player').pause());$('media-dialog').addEventListener('close',()=>{$('film-player').pause();$('guide-audio').pause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 const coords={api:[225,325],data:[675,325],net:[450,152],dispatch:[450,452]},personPos={},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function initWorld(){if(!window.Phaser){$('world').innerHTML='<p style="padding:80px 25px">Карта не загрузилась. Все действия доступны в панелях ниже.</p>';return;}
 class Room extends Phaser.Scene{
  constructor(){super('Room');this.tokens=new Map();this.workers={};this.teamLabels={};}
  preload(){this.load.image('room','assets/control-room.jpg?v=2');}
  create(){scene=this;const g=this.add.graphics();
   g.fillStyle(0x19353a,1);g.fillRoundedRect(35,62,830,440,35);
   if(this.textures.exists('room'))this.add.image(450,282,'room').setDisplaySize(750,422).setAlpha(.65);
   g.lineStyle(2,0x426064,.8);g.beginPath();g.moveTo(225,325);g.lineTo(450,152);g.lineTo(675,325);g.lineTo(450,452);g.closePath();g.strokePath();g.lineBetween(225,325,675,325);
   for(const t of M.teams){const[x,y]=coords[t.id],col=Phaser.Display.Color.HexStringToColor(t.color).color;const bg=this.add.graphics();bg.fillStyle(0x0e2429,.96);bg.fillRoundedRect(x-137,y-47,274,115,13);bg.lineStyle(1,col,.6);bg.strokeRoundedRect(x-137,y-47,274,115,13);
    this.add.text(x,y-29,t.name.toUpperCase(),{fontFamily:'Golos,Arial',fontSize:'14px',color:t.color,fontStyle:'bold',letterSpacing:1}).setOrigin(.5);
    this.teamLabels[t.id]=this.add.text(x,y-6,'',{fontFamily:'Golos,Arial',fontSize:'12px',color:'#d5e2d4'}).setOrigin(.5);
    const zone=this.add.zone(x,y,274,110).setRectangleDropZone(274,110).setInteractive({useHandCursor:true});zone.team=t.id;zone.on('pointerdown',()=>{state.selectedTeam=t.id;render();});
    const pp=M.people.filter(p=>p.team===t.id);
    pp.forEach((p,i)=>{const px=x-72+i*72,py=y+42;personPos[p.id]=[px,py];const container=this.add.container(px,py);const halo=this.add.circle(0,0,19,0x365453).setStrokeStyle(2,0x517269);const body=this.add.circle(0,-2,12,col);const head=this.add.circle(0,-9,7,0xe5c9aa);const icon=this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'17px',color:'#f3d1bf',fontStyle:'bold'}).setOrigin(.5);const label=this.add.text(0,27,p.name,{fontFamily:'Golos,Arial',fontSize:'11px',color:'#e3e7d9'}).setOrigin(.5);container.add([halo,body,head,icon,label]);container.setSize(40,50).setInteractive({useHandCursor:true});container.pid=p.id;this.input.setDraggable(container);container.on('pointerdown',()=>choosePerson(p.id));this.workers[p.id]={container,halo,body,head,icon,label};});
   }
   const dx=450,dy=455;personPos.mira=[dx,dy];this.dispatchBox=this.add.container(dx,dy,[this.add.rectangle(0,0,220,54,0x0e2429,.97).setStrokeStyle(1,0x769287),this.add.text(0,-11,'ОБЩИЙ ПОСТ · МИРА',{fontFamily:'Golos,Arial',fontSize:'12px',color:'#b7d1bf'}).setOrigin(.5)]);this.postLabel=this.add.text(dx,dy+10,'не используется',{fontFamily:'Golos,Arial',fontSize:'11px',color:'#95aeac'}).setOrigin(.5);
   this.input.on('drag',(p,obj,x,y)=>{obj.x=x;obj.y=y;obj.setDepth(20);});
   this.input.on('drop',(p,obj,zone)=>{if(obj.pid&&zone.team)prepareDrop(obj.pid,zone.team);});
   this.input.on('dragend',(p,obj)=>{const pos=personPos[obj.pid];if(pos)this.tweens.add({targets:obj,x:pos[0],y:pos[1],duration:reduced?0:250,onComplete:()=>obj.setDepth(0)});});
   this.sync();
  }
  resetTokens(){for(const t of this.tokens.values())t.destroy();this.tokens.clear();this.sync();}
  sync(){if(!this.teamLabels.api)return;
   for(const t of M.teams){const c=M.coverage(state,t.id);this.teamLabels[t.id].setText(c.person?'Дежурит '+M.name(c.person):'× Нет покрытия');}
   for(const p of M.people){const w=this.workers[p.id];if(!w)continue;const c=M.coverage(state,p.team),abs=state.absent[p.id],busy=!M.available(state,p.id);w.halo.setStrokeStyle(p.id===state.selectedPerson?3:2,p.id===state.selectedPerson?0xf1d384:c.person===p.id?0xb7d1a0:0x496967);w.body.setAlpha(abs?.3:1);w.head.setAlpha(abs?.3:1);w.icon.setText(abs?'×':busy?'•':'');w.label.setColor(abs?'#ecb298':'#e3e7d9');}
   const post=state.architecture==='dispatch'||state.incidents.some(i=>i.post);this.dispatchBox.setAlpha(post?1:.35);this.postLabel.setAlpha(post?1:.35).setText(post?state.incidents.filter(i=>i.owner==='mira'&&i.status!=='resolved').length+' / 2 занято · '+state.incidents.filter(i=>i.status==='queued').length+' в очереди':'не используется');
   for(const i of state.incidents){let token=this.tokens.get(i.id);if(!token){token=this.add.container(450,260);const gem=this.add.rectangle(0,0,23,23,0xe7bf6a).setAngle(45);const text=this.add.text(0,0,String(i.id),{fontFamily:'Golos,Arial',fontSize:'12px',color:'#283a2d',fontStyle:'bold'}).setOrigin(.5);token.add([gem,text]);token.setSize(32,32).setInteractive({useHandCursor:true});token.on('pointerdown',()=>{state.selected=i.id;render();});token.gem=gem;token.setDepth(12);this.tokens.set(i.id,token);}
    const pos=i.status==='queued'?[350+(i.id%4)*34,503]:personPos[i.owner]||[450,260];const to=i.status==='resolved'?[100+(i.id%10)*33,498]:[pos[0]+((i.id%3)-1)*16,pos[1]-39];const key=to.join(',')+i.status;
    if(token.dest!==key){this.tweens.killTweensOf(token);this.tweens.add({targets:token,x:to[0],y:to[1],duration:reduced?0:650,ease:'Cubic.easeInOut'});token.dest=key;}
    token.gem.setFillStyle(i.status==='resolved'?0xa7bf9d:i.status==='ack'?0x8fb9b1:0xe7bf6a);token.setAlpha(i.status==='resolved'?.5:1);token.setScale(i.id===state.selected?1.15:1);
   }
   for(const[id,token]of this.tokens)if(!state.incidents.some(i=>i.id===id)){token.destroy();this.tokens.delete(id);}
  }
 }
 world=new Phaser.Game({type:Phaser.CANVAS,parent:'world',width:900,height:560,backgroundColor:'#152b30',scene:Room,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true},banner:false});
 }
 render();document.fonts.ready.then(initWorld);
})();
