'use strict';
'require view';
'require rpc';
'require ui';

var callStatus=rpc.declare({object:'luci.easyroute',method:'status',expect:{}});
var callList=rpc.declare({object:'luci.easyroute',method:'list_rules',expect:{}});
var callProfiles=rpc.declare({object:'luci.easyroute',method:'profiles',expect:{}});
var callDevices=rpc.declare({object:'luci.easyroute',method:'devices',expect:{}});
var callDiscover=rpc.declare({object:'luci.easyroute',method:'discover_devices',expect:{}});
var callSelftest=rpc.declare({object:'luci.easyroute',method:'selftest',expect:{}});
var callGet=rpc.declare({object:'luci.easyroute',method:'get_rule',params:['id'],expect:{}});
var callSave=rpc.declare({object:'luci.easyroute',method:'save_rule',params:['id','name','enabled','content','source_type','source_url','auto_update','update_interval','profile'],expect:{}});
var callToggle=rpc.declare({object:'luci.easyroute',method:'toggle_rule',params:['id','enabled'],expect:{}});
var callDelete=rpc.declare({object:'luci.easyroute',method:'delete_rule',params:['id'],expect:{}});
var callUpdate=rpc.declare({object:'luci.easyroute',method:'update_rule',params:['id'],expect:{}});
var callSaveDevice=rpc.declare({object:'luci.easyroute',method:'save_device',params:['id','name','mac','profile','enabled'],expect:{}});
var callDeleteDevice=rpc.declare({object:'luci.easyroute',method:'delete_device',params:['id'],expect:{}});
var callDiag=rpc.declare({object:'luci.easyroute',method:'diagnostics',expect:{}});
var callCatalog=rpc.declare({object:'luci.easyroute',method:'catalog',expect:{}});
var callSaveCatalog=rpc.declare({object:'luci.easyroute',method:'save_catalog',params:['id','name','profile','main_sites','beta_sites','use_cidr4'],expect:{}});
var callDnsStatus=rpc.declare({object:'luci.easyroute',method:'dns_status',expect:{}});
var callDnsApply=rpc.declare({object:'luci.easyroute',method:'dns_apply',params:['enabled','provider'],expect:{}});

function notify(r){ui.addNotification(null,E('p',{},(r&&r.message)||((r&&r.ok)?'Готово':'Ошибка')),(r&&r.ok)?'info':'error');}
function bytes(n){n=Number(n||0);if(n>1073741824)return(n/1073741824).toFixed(1)+' ГБ';if(n>1048576)return(n/1048576).toFixed(1)+' МБ';if(n>1024)return(n/1024).toFixed(0)+' КБ';return n+' Б';}
function ago(v){v=Number(v||0);if(!v)return 'нет handshake';if(v<60)return v+' сек. назад';if(v<3600)return Math.floor(v/60)+' мин. назад';return Math.floor(v/3600)+' ч. назад';}
function closeBtn(){return E('button',{class:'btn',type:'button',style:'font-size:22px;min-width:42px',click:ui.hideModal,title:'Закрыть'},'✕');}
function profileSelect(ps,val){var a=ps.map(function(p){return E('option',{value:p.id},(p.up?'🟢 ':'🔴 ')+p.name);});var s=E('select',{class:'cbi-input-select',style:'width:100%;max-width:520px'},a);s.value=val||((ps[0]||{}).id||'');return s;}
function refresh(){window.location.reload();}
function manualEditor(rule,ps){
 rule=rule||{id:'',name:'',content:'',source_type:'manual',source_url:'',profile:'',enabled:true};
 var name=E('input',{class:'cbi-input-text',style:'width:100%',value:rule.name||'',placeholder:'Например: Мой сайт'});
 var prof=profileSelect(ps,rule.profile);var url=E('input',{class:'cbi-input-text',style:'width:100%',value:rule.source_url||'',placeholder:'https://...'});
 var txt=E('textarea',{class:'cbi-input-textarea',style:'width:100%;min-height:190px',placeholder:'example.com\n1.2.3.0/24'},[rule.content||'']);
 var source=E('select',{class:'cbi-input-select'},[E('option',{value:'url'},'🔗 Ссылка на список'),E('option',{value:'manual'},'📝 Вставить вручную')]);source.value=rule.source_type==='url'?'url':'manual';
 var boxUrl=E('div',{},[E('p',{},'🔗 Адрес списка'),url]);var boxTxt=E('div',{},[E('p',{},'📝 Домены или IP — по одному в строке'),txt]);
 function sync(){boxUrl.style.display=source.value==='url'?'':'none';boxTxt.style.display=source.value==='manual'?'':'none';}source.addEventListener('change',sync);sync();
 var save=E('button',{class:'btn cbi-button cbi-button-action',type:'button'},'💾 Сохранить');
 save.addEventListener('click',function(){save.disabled=true;callSave(rule.id||'',name.value.trim(),true,txt.value,source.value,url.value.trim(),true,'86400',prof.value).then(function(r){notify(r);if(r.ok){ui.hideModal();setTimeout(refresh,500);}else save.disabled=false;}).catch(function(e){notify({ok:false,message:e.message});save.disabled=false;});});
 ui.showModal((rule.id?'✏️ Изменить':'➕ Добавить')+' маршрут',[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('div',{class:'cbi-section'},[
  E('p',{},'🏷️ Название'),name,E('p',{},'🛡️ Через какой VPN'),prof,E('p',{},'📦 Откуда брать адреса'),source,boxUrl,boxTxt
 ]),E('div',{class:'right'},[E('button',{class:'btn',type:'button',click:ui.hideModal},'↩️ Отмена'),' ',save])]);
}

function catalogEditor(ps,rule){
 rule=rule||{id:'',name:'',profile:'',catalog_main_sites:'',catalog_beta_sites:''};
 ui.showModal('🧩 Каталог OpenCCK',[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('p',{},'⏳ Загружаю каталоги OpenCCK...')]);

 callCatalog().then(function(r){
  if(!r.ok)throw new Error(r.message||'Не удалось загрузить каталог');

  var main={},beta={};
  try{main=JSON.parse(r.main_json||'{}');}catch(e){main={};}
  try{beta=JSON.parse(r.beta_json||'{}');}catch(e){beta={};}

  var map={};
  Object.keys(main).forEach(function(site){
   map[site]={site:site,group:String(main[site]||'other'),source:'main'};
  });
  Object.keys(beta).forEach(function(site){
   if(map[site]) map[site].source='both';
   else map[site]={site:site,group:String(beta[site]||'other'),source:'beta'};
  });

  var entries=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){
   return a.group.localeCompare(b.group)||a.site.localeCompare(b.site);
  });
  if(!entries.length)throw new Error('OpenCCK вернул пустой каталог');

  var selected={};
  String(rule.catalog_main_sites||'').split(/\s+/).filter(Boolean).forEach(function(x){selected[x]=true;});
  String(rule.catalog_beta_sites||'').split(/\s+/).filter(Boolean).forEach(function(x){selected[x]=true;});

  var name=E('input',{class:'cbi-input-text',style:'width:100%',value:rule.name||'',placeholder:'Например: Мои сервисы'});
  var prof=profileSelect(ps,rule.profile||'');
  var q=E('input',{class:'cbi-input-text',style:'width:100%',placeholder:'🔎 Поиск: chatgpt, instagram, ai...'});
  var groups=[''].concat(Array.from(new Set(entries.map(function(x){return x.group;}))).sort());
  var groupSel=E('select',{class:'cbi-input-select',style:'width:100%;max-width:520px'},groups.map(function(g){
   return E('option',{value:g},g?'📁 '+g:'Все категории');
  }));
  var sourceSel=E('select',{class:'cbi-input-select'},[
   E('option',{value:'all'},'Основной + Beta'),
   E('option',{value:'main'},'Основной'),
   E('option',{value:'beta'},'Beta')
  ]);
  var cidr=E('input',{type:'checkbox'});
  cidr.checked=!!rule.catalog_use_cidr4;
  var cidrRow=E('label',{style:'display:flex;gap:8px;align-items:flex-start;margin-top:10px'},[
   cidr,E('span',{},[
    E('strong',{},'Добавлять IPv4 CIDR'),
    E('br'),
    E('span',{style:'font-size:12px;opacity:.7'},'Расширенный режим. OpenCCK может отдавать очень широкие подсети, из-за чего через VPN пойдут и посторонние сайты. Для обычного использования оставьте выключенным.')
   ])
  ]);
  var list=E('div',{style:'max-height:48vh;overflow:auto;border-top:1px solid #666;margin-top:10px'});
  var counter=E('strong',{},'0');
  var selectVisible=E('button',{class:'btn cbi-button',type:'button'},'☑ Выбрать показанные');

  function sourceMatches(x){
   if(sourceSel.value==='all')return true;
   if(sourceSel.value==='main')return x.source==='main'||x.source==='both';
   return x.source==='beta'||x.source==='both';
  }
  function visibleEntries(){
   var needle=q.value.trim().toLowerCase(),g=groupSel.value;
   return entries.filter(function(x){
    return (!g||x.group===g)&&sourceMatches(x)&&(!needle||x.site.toLowerCase().indexOf(needle)>=0||x.group.toLowerCase().indexOf(needle)>=0);
   });
  }
  function updateCounter(){
   var n=Object.keys(selected).filter(function(k){return selected[k];}).length;
   counter.textContent=String(n);
  }
  function draw(){
   list.innerHTML='';
   var vis=visibleEntries();
   vis.forEach(function(x){
    var cb=E('input',{type:'checkbox'});cb.checked=!!selected[x.site];
    cb.addEventListener('change',function(){selected[x.site]=cb.checked;updateCounter();});
    var badge=x.source==='main'?'основной':(x.source==='beta'?'beta':'основной+beta');
    list.appendChild(E('label',{style:'display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid #555;cursor:pointer'},[
     cb,E('span',{style:'flex:1'},[E('strong',{},x.site),E('span',{style:'font-size:11px;opacity:.65;margin-left:8px'},'📁 '+x.group)]),
     E('span',{style:'font-size:11px;opacity:.65'},badge)
    ]));
   });
   if(!vis.length)list.appendChild(E('p',{},'Ничего не найдено'));
   updateCounter();
  }
  q.addEventListener('input',draw);groupSel.addEventListener('change',draw);sourceSel.addEventListener('change',draw);
  selectVisible.addEventListener('click',function(){
   var vis=visibleEntries(),all=vis.length&&vis.every(function(x){return selected[x.site];});
   vis.forEach(function(x){selected[x.site]=!all;});
   selectVisible.textContent=all?'☑ Выбрать показанные':'☐ Снять показанные';
   draw();
  });

  var save=E('button',{class:'btn cbi-button cbi-button-action',type:'button'},'🚀 Скачать выбранное и включить');
  save.addEventListener('click',function(){
   var chosen=entries.filter(function(x){return selected[x.site];});
   if(!chosen.length){notify({ok:false,message:'Выберите хотя бы один сервис'});return;}
   var mainSites=[],betaSites=[];
   chosen.forEach(function(x){
    if(x.source==='main'||x.source==='both')mainSites.push(x.site);
    else betaSites.push(x.site);
   });
   var nm=name.value.trim();
   if(!nm){
    var gs=Array.from(new Set(chosen.map(function(x){return x.group;})));
    nm=gs.length===1?'📦 '+gs[0]+' · '+chosen.length:'📦 OpenCCK · '+chosen.length+' сервисов';
   }
   save.disabled=true;
   callSaveCatalog(rule.id||'',nm,prof.value,mainSites.join(' '),betaSites.join(' ')).then(function(x){
    notify(x);
    if(x.ok){ui.hideModal();setTimeout(refresh,600);}else save.disabled=false;
   }).catch(function(e){notify({ok:false,message:e.message});save.disabled=false;});
  });

  ui.showModal('🧩 Каталог OpenCCK',[
   E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),
   E('p',{},[
    'Каталог загружается только при открытии этого окна и не сохраняется во flash. ',
    'На роутер скачиваются только списки выбранных сервисов после нажатия кнопки ниже.'
   ]),
   E('p',{},[(r.main_ok?'✅ ':'❌ ')+'Основной каталог · '+(r.beta_ok?'✅ ':'❌ ')+'Beta-каталог']),
   E('p',{},'🏷️ Название'),name,
   E('p',{},['🛡️ Через какой VPN ']),prof,
   E('div',{style:'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px'},[q,groupSel,sourceSel]),
   cidrRow,
   E('p',{},['Выбрано: ',counter,' сервисов · всего в объединённом каталоге: '+entries.length]),
   selectVisible,
   list,
   E('div',{class:'right',style:'margin-top:14px'},[
    E('button',{class:'btn',type:'button',click:ui.hideModal},'↩️ Отмена'),' ',save
   ])
  ]);
 }).catch(function(e){
  ui.showModal('🧩 Каталог OpenCCK',[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('p',{},'❌ '+e.message)]);
 });
}
function devicePicker(ps){
 callDiscover().then(function(r){
  var list=E('div');(r.devices||[]).forEach(function(d){var b=E('button',{class:'btn cbi-button',type:'button'},'➕');b.addEventListener('click',function(){var p=profileSelect(ps,'');ui.showModal('📱 '+(d.name||d.ip),[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('p',{},'MAC: '+d.mac+' · IP: '+d.ip),E('p',{},'🛡️ Всегда направлять через'),p,E('button',{class:'btn cbi-button cbi-button-action',type:'button',click:function(){callSaveDevice('',d.name||d.ip,d.mac,p.value,true).then(function(x){notify(x);if(x.ok)setTimeout(refresh,400);});}},'💾 Сохранить')]);});list.appendChild(E('p',{},['📱 ',E('strong',{},d.name||d.ip),' · '+d.ip+' ',b]));});
  ui.showModal('📱 Устройства в сети',[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('p',{},'Выберите устройство. MAC-адрес вводить вручную не нужно 👍'),list]);
 });
}
function healthBox(){
 callSelftest().then(function(r){var rows=[['🌍 Интернет',r.internet],['🛡️ VPN / свежий handshake',r.vpn],['🔥 Firewall',r.firewall],['🌐 DNS',r.dns],['🔐 DoT (если включён)',r.dot],['🧭 Маршрутизация EasyRoute',r.routing],['🔄 Доступ к источнику списков',r.updater],['🧩 Каталог OpenCCK',r.catalog],['⚠️ Нет конфликтов ip rule',!r.conflicts]];ui.showModal('🩺 Проверка EasyRoute',[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('div',{class:'cbi-section'},rows.map(function(x){return E('p',{},[(x[1]?'✅ ':'❌ '),E('strong',{},x[0])]);}))]);});
}
return view.extend({
 load:function(){return Promise.all([callStatus(),callList(),callProfiles(),callDevices(),callSelftest(),callDnsStatus()]);},
 render:function(data){
  var s=data[0]||{},rules=(data[1]||{}).rules||[],ps=(data[2]||{}).profiles||[],devs=(data[3]||{}).devices||[],health=data[4]||{},dnsState=data[5]||{};
  var title=E('div',{class:'cbi-section'},[E('h2',{},'🚀 EasyRoute 1.2.20'),E('p',{},'VPN и маршрутизация без сложных настроек ✨')]);
  var state=E('div',{class:'cbi-section'},[
   E('h3',{},health.all_ok?'🟢 Всё работает':'🟠 Нужна проверка'),
   E('p',{},['🌍 Интернет · ',E('strong',{},health.internet?'доступен':'ошибка')]),
   E('p',{},['🛡️ VPN · ',E('strong',{},s.interface||'AWG'),' · ',health.vpn?'работает':'нет свежего handshake',' · ',ago(s.handshake_age)]),
   E('p',{},['🧭 Маршруты · ',health.routing?'✅':'❌',' · 🔄 списки · ',health.updater?'✅':'❌',health.conflicts?' · ⚠️ конфликт ip rule':'']),
   E('p',{},'📊 ↓ '+bytes(s.rx_bytes)+' · ↑ '+bytes(s.tx_bytes)+' · 💾 свободно '+(Number(s.overlay_free_kb||0)/1024).toFixed(1)+' МБ'),
   E('button',{class:'btn cbi-button',type:'button',click:healthBox},'🩺 Проверить всё')
  ]);
  var apps=E('div',{class:'cbi-section'},[E('h3',{},'🧩 Приложения и сайты'),E('p',{},'Что должно идти через VPN')]);
  rules.forEach(function(r){
   var sw=E('input',{type:'checkbox'});sw.checked=r.enabled!==false;sw.addEventListener('change',function(){sw.disabled=true;callToggle(r.id,sw.checked).then(function(x){notify(x);if(!x.ok)sw.checked=!sw.checked;sw.disabled=false;});});
   var edit=E('button',{class:'btn cbi-button',type:'button'},'✏️');edit.addEventListener('click',function(){callGet(r.id).then(function(x){if(x.ok){if(x.source_type==='catalog')catalogEditor(ps,x);else manualEditor(x,ps);}});});
   var del=E('button',{class:'btn cbi-button cbi-button-remove',type:'button'},'🗑️');del.addEventListener('click',function(){if(confirm('Удалить «'+r.name+'»?'))callDelete(r.id).then(function(x){notify(x);if(x.ok)setTimeout(refresh,350);});});
   apps.appendChild(E('div',{style:'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 2px;border-bottom:1px solid #666'},[
    E('div',{},[E('strong',{},r.name),E('div',{style:'font-size:12px;opacity:.65'},'📦 '+r.count+' записей · '+(r.source_type==='catalog'?'🧩 '+(r.site_count||0)+' сервисов · 🔄 каталог':('🔄 '+(r.source_type==='url'?'авто':'вручную'))))]),
    E('div',{},[sw,' ',edit,' ',del])
   ]));
  });
  apps.appendChild(E('p',{},[E('button',{class:'btn cbi-button cbi-button-action',type:'button',click:function(){catalogEditor(ps,null);}},'➕ Добавить приложение'),' ',E('button',{class:'btn cbi-button',type:'button',click:function(){manualEditor(null,ps);}},'🛠️ Вручную')]));
  var vpn=E('div',{class:'cbi-section'},[E('h3',{},'🛡️ VPN')]);
  ps.forEach(function(p){var hs=Number(p.handshake_age||0);var st=p.up?(hs>0?'подключён · '+ago(hs):'интерфейс поднят · нет handshake'):'интерфейс выключен';vpn.appendChild(E('p',{},[(p.up?'🟢 ':'🔴 '),E('strong',{},p.name),' · '+p.interface,E('span',{style:'opacity:.6'},' · '+st)]));});
  vpn.appendChild(E('p',{},'💡 EasyRoute использует обычные системные интерфейсы AmneziaWG и не прячет VPN внутри себя.'));
  vpn.appendChild(E('button',{class:'btn cbi-button',type:'button',click:function(){window.location.href=L.url('admin/network/network');}},'➕ Добавить / импортировать AWG'));
  var dns=E('div',{class:'cbi-section'},[E('h3',{},'🌐 Защищённый DNS (DoT)')]);
  var dnsProvider=E('select',{class:'cbi-input-select'},[
   E('option',{value:'adguard'},'🛡️ AdGuard DNS'),
   E('option',{value:'cloudflare'},'☁️ Cloudflare DNS'),
   E('option',{value:'google'},'🌍 Google DNS')
  ]);
  dnsProvider.value=dnsState.provider||'adguard';
  dns.appendChild(E('p',{},dnsState.enabled?
   ['🟢 Включён · ',E('strong',{},dnsState.provider||'DoT'),dnsState.healthy?' · работает':' · ⚠️ нужна проверка']:
   ['⚪ Выключен · используется системный DNS']));
  dns.appendChild(E('p',{},'EasyRoute оставляет dnsmasq перед Stubby, поэтому доменные nftset-маршруты продолжают работать. WAN/PPPoE, IPv6 и DNS-интерфейсов EasyRoute не меняет.'));
  dns.appendChild(E('p',{},['Провайдер: ',dnsProvider]));
  var dnsBtn=E('button',{class:'btn cbi-button '+(dnsState.enabled?'cbi-button-remove':'cbi-button-action'),type:'button'},dnsState.enabled?'⏹️ Отключить DoT':'🔐 Включить DoT');
  dnsBtn.addEventListener('click',function(){
   dnsBtn.disabled=true;
   if(!dnsState.enabled && !confirm('EasyRoute установит Stubby при необходимости и переключит только upstream dnsmasq на DoT. Продолжить?')){dnsBtn.disabled=false;return;}
   callDnsApply(!dnsState.enabled,dnsProvider.value).then(function(r){notify(r);if(r.ok)setTimeout(refresh,700);else dnsBtn.disabled=false;}).catch(function(e){notify({ok:false,message:e.message});dnsBtn.disabled=false;});
  });
  dns.appendChild(dnsBtn);
  dns.appendChild(E('p',{style:'font-size:12px;opacity:.7'},'ℹ️ Если Stubby уже был установлен вручную, EasyRoute откажется перезаписывать его конфигурацию, чтобы избежать конфликта.'));

  var devices=E('div',{class:'cbi-section'},[E('h3',{},'📱 Устройства'),E('p',{},'Можно отправить целиком телефон, ТВ или компьютер через VPN.')]);
  devs.forEach(function(d){var del=E('button',{class:'btn cbi-button cbi-button-remove',type:'button'},'🗑️');del.addEventListener('click',function(){callDeleteDevice(d.id).then(function(x){notify(x);if(x.ok)setTimeout(refresh,350);});});devices.appendChild(E('p',{},['📱 ',E('strong',{},d.name||d.mac),' · '+d.mac+' ',del]));});
  devices.appendChild(E('button',{class:'btn cbi-button cbi-button-action',type:'button',click:function(){devicePicker(ps);}},'🔎 Найти устройства автоматически'));
  var adv=E('details',{class:'cbi-section'},[E('summary',{},'⚙️ Для опытных'),E('p',{},'🧭 Домены: '+(s.domain_count||0)+' · 📡 IP/CIDR: '+(s.ip_count||0)+' · 🕒 Последнее применение: '+(s.last_apply||'—')),E('button',{class:'btn cbi-button',type:'button',click:function(){callDiag().then(function(r){ui.showModal('🔧 Диагностика',[E('div',{style:'display:flex;justify-content:flex-end'},closeBtn()),E('pre',{style:'white-space:pre-wrap;max-height:65vh;overflow:auto'},JSON.stringify(r,null,2))]);});}},'🔧 Техническая диагностика')]);
  return E('div',{},[title,state,apps,vpn,dns,devices,adv]);
 }
});