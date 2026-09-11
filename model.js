(function(root){
const people=['Анна','Борис','Вера'];
function resolve({day=0,hour=13,cadence=1,base=true,weekend=true,override=false}){
 const slot=Math.floor(day/cadence), scheduled=people[slot%3];
 const baseActive=base, weekendActive=weekend&&day%7>=5;
 const replacement=override&&day===2&&hour>=12&&hour<16;
 return {person:replacement?'Илья':weekendActive?'Глеб':baseActive?scheduled:null,source:replacement?'Временная замена':weekendActive?'Выходные · приоритет 30':baseActive?'Базовый слой · приоритет 10':'Нет подходящего слоя',baseActive,weekendActive,replacement,scheduled};
}
function segments(start,end,enabled){
 if(!enabled)return [{start:9,end:18,person:'Анна',override:false}];
 let out=[];if(start>9)out.push({start:9,end:start,person:'Анна',override:false});
 out.push({start,end,person:'Илья',override:true});if(end<18)out.push({start:end,end:18,person:'Анна',override:false});return out;
}
function initial(mode='policy',repeat=0){return {mode,repeat,minute:0,target:0,cycle:0,count:0,status:'firing',done:false,events:[{minute:0,text:'Инцидент назначен: Анна. Начальное уведомление доставлено.'}]};}
function advance(s,{delivery=true,interval=5,threshold=2}={}){
 if(s.status!=='firing'||s.done)return s;
 let n={...s,events:[...s.events]},text='';
 if(s.mode==='policy'){
  n.minute += [5,10,15][s.target];
  if(s.target===2&&s.cycle>=s.repeat){n.done=true;text='Политика исчерпана. Инцидент остаётся firing; напоминания прекращены.';}
  else {n.target=(s.target+1)%3;if(n.target===0)n.cycle++;text='Назначен: '+['Анна','Глеб','Илья'][n.target]+'. '+(delivery?'Уведомление доставлено.':'Сбой доставки: назначение состоялось, сообщение не доставлено.');}
 }else{
  if(interval===0)return {...n,events:[...n.events,{minute:n.minute,text:'Напоминания отключены. Простой режим не продвигается.'}]};
  n.minute+=interval;
  if(s.count>=threshold){n.target=(s.target+1)%3;n.count=0;text='Инцидент передан: '+people[n.target]+'. Календарь дежурств не изменился. '+(delivery?'Уведомление доставлено.':'Сбой доставки уведомления об эскалации.');}
  else if(!delivery){text='Нет успешной доставки. Счётчик напоминаний не увеличен.';}
  else{n.count++;text='Напоминание '+n.count+' доставлено: '+people[n.target]+'.';}
 }
 n.events.push({minute:n.minute,text});return n;
}
function accept(s){if(s.status!=='firing')return s;return {...s,status:'acknowledged',events:[...s.events,{minute:s.minute,text:'Принят в работу (ACK). Дальнейшая эскалация остановлена; проблема ещё не решена.'}]};}
function close(s){if(s.status==='resolved')return s;return {...s,status:'resolved',events:[...s.events,{minute:s.minute,text:'Инцидент решён.'}]};}
function candidate(absent,busy,backupAbsent){return !absent?'Анна':!busy&&!backupAbsent?'Борис':null;}
const api={people,resolve,segments,initial,advance,accept,close,candidate};root.Atlas=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
