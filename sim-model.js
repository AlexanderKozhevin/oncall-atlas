(function(root){
'use strict';
const teams=[
 {id:'api',name:'Платформа',service:'API',color:'#9fbea6',people:['anna','boris'],lead:'ilya'},
 {id:'data',name:'Данные',service:'База данных',color:'#dba28b',people:['vera','denis'],lead:'olga'},
 {id:'net',name:'Сеть',service:'Сеть / CDN',color:'#e3c879',people:['gleb','lena'],lead:'max'}
];
const people=[['anna','Анна','api'],['boris','Борис','api'],['ilya','Илья','api'],['vera','Вера','data'],['denis','Денис','data'],['olga','Ольга','data'],['gleb','Глеб','net'],['lena','Лена','net'],['max','Макс','net'],['mira','Мира','dispatch']].map(([id,name,team])=>({id,name,team}));
const missions=[
 {id:'first',title:'Первый сигнал',tag:'01 · ОСНОВЫ',description:'У API проблема. Найдите ответственного, примите сигнал и решите инцидент.',steps:[['created','Запустить сбой API'],['acked','Принять инцидент в работу'],['resolved','Решить инцидент']],lesson:'Принять — значит заняться проблемой. Решить — восстановить сервис. Это два разных действия.',guide:'rotation.html'},
 {id:'sick',title:'Анна заболела',tag:'02 · ЗАМЕНА',description:'Сигнал ушёл Анне, но она недоступна. Подмените её до 16:00 и отдельно переназначьте уже открытый инцидент.',steps:[['override','Назначить временную замену'],['rerouted','Переназначить открытый инцидент'],['resolved','Принять и решить инцидент']],lesson:'Замена меняет покрытие заданного окна. Открытый инцидент не обязан автоматически сменить владельца, а будущая очередь не сдвигается.',guide:'replacements.html'},
 {id:'silent',title:'Никто не отвечает',tag:'03 · ЭСКАЛАЦИЯ',description:'Не принимайте сигнал сразу. Продвиньте время на 5 минут и проследите, как инцидент попадёт в резерв.',steps:[['escalated','Дождаться шага эскалации'],['acked','Принять сигнал у нового адресата'],['resolved','Закрыть инцидент']],lesson:'Здесь задан учебный маршрут: основной в 0 минут, резерв в 5, руководитель в 15. После ACK эскалация останавливается, календарь остаётся прежним.',guide:'escalation.html'},
 {id:'holiday',title:'Праздник в среду',tag:'04 · ИСКЛЮЧЕНИЯ',description:'Отметьте праздник в среду. Посмотрите: подпись дня не меняет ответственного. Обеспечьте покрытие явной заменой.',steps:[['holidayMarked','Отметить праздник'],['override','Назначить покрытие до 16:00'],['resolved','Принять и решить сигнал']],lesson:'Метка «праздник» в тренажёре не включает слой выходного дня. Покрытие нужно задать отдельным правилом или заменой.',guide:'simplify.html'},
 {id:'slots',title:'Можно без ротации',tag:'05 · НОВАЯ АРХИТЕКТУРА',description:'В этом концепте источник ответственности — конкретная смена. Создайте назначение Платформе на 09:00–18:00, затем запустите сбой.',steps:[['shift','Заполнить смену Платформы'],['created','Запустить сигнал API'],['resolved','Принять и решить сигнал']],lesson:'Ротация может готовить будущие смены, а поиск ответственного читает явные назначения. Нужны контроль пробелов, конфликтов и подтверждение замен. Это предложение, не текущая реализация.',guide:'alternatives.html'},
 {id:'dispatch',title:'Три команды, один вход',tag:'06 · ОБЩИЙ ПОСТ',description:'В общей диспетчерской два места. Создайте три разных сигнала: третий ждёт в очереди. Передайте сигналы профильным командам.',steps:[['queue','Создать очередь из трёх сигналов'],['handoff','Передать сигнал профильной команде'],['resolvedAll','Решить все три инцидента']],lesson:'Общий пост упрощает первый контакт, но становится отдельным ограничением пропускной способности. Нужны ёмкость поста, эксперты и резерв. Это концепт.',guide:'alternatives.html'},
 {id:'sandbox',title:'Свободная смена',tag:'ПЕСОЧНИЦА',description:'Сравнивайте три архитектуры, запускайте сбои, меняйте людей и время. Здесь можно экспериментировать без цели.',steps:[],lesson:'Все люди, ёмкости и задержки учебные. Тренажёр не подключён к рабочей системе.',guide:'about.html'}
];
const name=id=>people.find(p=>p.id===id)?.name||'Никто';
function log(s,text,type='info'){s.log.unshift({minute:s.minute,text,type});s.log=s.log.slice(0,60);}
function createState(mission='first'){
 const s={mission,architecture:mission==='slots'?'shifts':mission==='dispatch'?'dispatch':'rotation',day:mission==='holiday'?2:0,minute:0,hour:9,holiday:false,weekend:true,delivery:true,flags:{},absent:{},busy:{},overrides:[],slots:[],incidents:[],selected:null,selectedPerson:'anna',selectedTeam:'api',log:[],serial:1};
 for(let d=0;d<7;d++)for(const t of teams)s.slots.push({team:t.id,day:d,start:8,end:20,person:t.people[d%2]});
 if(mission==='slots')s.slots=s.slots.filter(x=>x.team!=='api');
 if(mission==='sick')s.absent.anna=true;
 log(s,'Учебная смена началась. Время идёт только по вашей команде.');
 if(['sick','silent','holiday'].includes(mission))spawn(s,'api');
 return s;
}
function clock(s){return {day:s.day+Math.floor((s.hour*60+s.minute)/1440),hour:((s.hour*60+s.minute)%1440)/60};}
function coverage(s,team){
 const t=teams.find(t=>t.id===team),c=clock(s);if(!t)return{person:null,source:'Неизвестная команда'};
 const o=s.overrides.findLast(o=>o.team===team&&o.day===c.day&&c.hour>=o.start&&c.hour<o.end);
 if(o)return{person:o.person,source:`Замена ${fmt(o.start)}–${fmt(o.end)}`,kind:'override'};
 if(s.architecture==='shifts'){
  const a=s.slots.filter(a=>a.team===team&&a.day===c.day&&c.hour>=a.start&&c.hour<a.end);
  return a.length===1?{person:a[0].person,source:`Смена ${fmt(a[0].start)}–${fmt(a[0].end)}`,kind:'shift'}:{person:null,source:a.length?'Конфликт смен':'Пробел в покрытии',kind:'gap'};
 }
 if(s.weekend&&c.day%7>=5)return{person:t.lead,source:'Слой выходного · приоритет 30',kind:'weekend'};
 return {person:t.people[c.day%2],source:'Базовая очередь · приоритет 10',kind:'rotation'};
}
function available(s,id,except){
 if(!id||s.absent[id]||s.busy[id])return false;
 if(id==='mira')return true;
 return !s.incidents.some(i=>i.id!==except&&i.owner===id&&i.status==='ack');
}
function route(s,t){const c=coverage(s,t.id),backup=t.people.find(p=>p!==c.person)||t.people[1];return[c.person,backup,t.lead];}
function spawn(s,team){
 if(s.incidents.filter(i=>i.status!=='resolved').length>=9){log(s,'Сначала разберите текущие сигналы: в тренажёре не больше 9 открытых инцидентов.','warn');return false;}
 const t=teams.find(x=>x.id===team);if(!t)return false;
 const dispatch=s.architecture==='dispatch';const inPost=s.incidents.filter(i=>i.owner==='mira'&&i.status!=='resolved').length;
 const r=route(s,t);const queued=dispatch&&inPost>=2;
 const i={id:s.serial++,team,created:s.minute,status:queued?'queued':'firing',owner:dispatch?(queued?null:'mira'):r[0],route:r,stage:0,next:s.minute+5,delivered:!queued&&!!(dispatch?'mira':r[0])&&s.delivery,post:dispatch,history:[]};
 s.incidents.push(i);s.selected=i.id;s.flags.created=true;
 if(queued)s.flags.queue=true;
 log(s,`#${i.id} · ${t.service}: ${queued?'очередь общего поста':name(i.owner)+' назначен(а)'+(i.delivered?' · сообщение доставлено':i.owner?' · сообщение НЕ доставлено':' · некому отправлять уведомление')}.`,queued?'warn':'alert');return true;
}
function fillQueue(s){
 let free=2-s.incidents.filter(i=>i.owner==='mira'&&i.status!=='resolved').length;
 for(const i of s.incidents.filter(i=>i.status==='queued')){if(free--<=0)break;i.status='firing';i.owner='mira';i.delivered=s.delivery;log(s,`#${i.id} поступил Мире: место на общем посту освободилось.`);}
}
function step(s,delta=5){
 delta=Math.max(1,Math.min(60,Number(delta)||5));const end=s.minute+delta;
 for(let m=s.minute+1;m<=end;m++){
  s.minute=m;
  for(const i of s.incidents){if(i.status!=='firing'||i.owner==='mira'||i.post||i.next==null||i.next>m)continue;
   if(i.stage>=2){i.next=null;log(s,`#${i.id}: маршрут исчерпан. Инцидент всё ещё активен. Нужен ручной разбор.`, 'warn');continue;}
   i.stage++;i.owner=i.route[i.stage];i.delivered=s.delivery;i.next=m+(i.stage===1?10:15);s.flags.escalated=true;
   log(s,`#${i.id}: эскалация → ${name(i.owner)}.${s.delivery?' Уведомление доставлено.':' Назначение сохранено, сообщение НЕ доставлено.'}`,'alert');
  }
 }
 return s;
}
function selected(s){return s.incidents.find(i=>i.id===s.selected);}
function ack(s){const i=selected(s);if(!i||i.status!=='firing')return false;
 if(!available(s,i.owner,i.id)){log(s,`#${i.id}: ${name(i.owner)} сейчас не может ответить. Нужны замена или следующий шаг маршрута.`,'warn');return false;}
 i.status='ack';i.next=null;s.flags.acked=true;log(s,`#${i.id}: ${name(i.owner)} принял(а) в работу. Эскалация остановлена. Сервис ещё не восстановлен.`,'ok');return true;}
function resolve(s){const i=selected(s);if(!i||i.status!=='ack')return false;
 if(i.owner==='mira'){log(s,'Общий пост принимает и передаёт. Для решения направьте сигнал профильной команде.','warn');return false;}
 i.status='resolved';s.flags.resolved=true;
 if(s.incidents.length>=3&&s.incidents.every(i=>i.status==='resolved'))s.flags.resolvedAll=true;
 log(s,`#${i.id}: сервис восстановлен. ${name(i.owner)} освободился(ась).`,'ok');fillQueue(s);return true;}
function reroute(s){const i=selected(s);if(!i||!['firing','ack'].includes(i.status))return false;const t=teams.find(t=>t.id===i.team);i.route=route(s,t);i.owner=i.route[0];i.stage=0;i.next=s.minute+5;i.status='firing';i.delivered=!!i.owner&&s.delivery;i.post=false;s.flags.rerouted=true;log(s,`#${i.id}: ручное переназначение по текущему покрытию → ${name(i.owner)}.`,i.owner?'info':'warn');fillQueue(s);return true;}
function handoff(s){const i=selected(s);if(!i||i.owner!=='mira'||!['firing','ack'].includes(i.status))return false;const ok=reroute(s);if(ok){s.flags.handoff=true;log(s,`#${i.id} передан профильной команде. Общий пост освободил место.`,'ok');}return ok;}
function assign(s,{team,person,start,end,kind='override'}){
 const c=clock(s);start=Number(start);end=Number(end);
 if(!teams.some(t=>t.id===team)||!people.some(p=>p.id===person&&p.team===team)){log(s,'Выберите человека из нужной команды. Межкомандную замену нужно заранее согласовать.','warn');return false;}
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>24||start>=end){log(s,'Нужен интервал внутри суток: начало раньше конца.','warn');return false;}
 if(!available(s,person)){log(s,`${name(person)} недоступен(на) или уже работает над инцидентом. Выберите свободного коллегу.`,'warn');return false;}
 const list=kind==='shift'?s.slots:s.overrides;
 if(list.some(o=>o.team===team&&o.day===c.day&&o.start<end&&start<o.end)){log(s,'В этом окне уже есть назначение. Сначала удалите его или выберите другое время.','warn');return false;}
 list.push({team,person,start,end,day:c.day});s.flags[kind]=true;log(s,`${kind==='shift'?'Смена':'Замена'} подтверждена: ${name(person)}, ${fmt(start)}–${fmt(end)}. Открытые инциденты сохраняют владельца.`,'ok');return true;
}
function setArchitecture(s,value){if(!['rotation','shifts','dispatch'].includes(value))return;s.architecture=value;log(s,'Новая архитектура применяется к будущим сигналам. Открытые инциденты сохраняют маршрут.');}
function fmt(h){return String(Math.floor(h)).padStart(2,'0')+':'+String(Math.round((h%1)*60)).padStart(2,'0');}
function complete(s){const m=missions.find(x=>x.id===s.mission);return m.steps.length>0&&m.steps.every(([k])=>s.flags[k]);}
const api={teams,people,missions,name,createState,clock,coverage,available,spawn,step,selected,ack,resolve,reroute,handoff,assign,fmt,complete,setArchitecture,log};root.DispatchSim=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
