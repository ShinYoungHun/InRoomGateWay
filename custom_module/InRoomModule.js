const util = require('util');
const EventEmitter = require('events').EventEmitter;
const jsxapi = require("jsxapi");
const request = require('sync-request');
const dateFormat = require('dateformat');
const utf8 = require('utf8');
const encoding = require("encoding");
const unicodeToJsEscape = require('unicode-escape');
const builder = require('xmlbuilder');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const fs = require('fs');
const defaultSetting = fs.readFileSync(__basedir+"/source/setting.json");
const defaultSettingJson = JSON.parse(defaultSetting);

function inRoomApi(endpoint){

    this.tempTMIp = defaultSettingJson['setting']['tmip']
    this.tempTMPort = defaultSettingJson['setting']['tmport']
    this.endpoint = endpoint;
    this.xapi;
    this.connectedStatus = 'false';
    this.tmStartDate;                 //TimeMeeting 시작 시간
    this.tmEndDate;                   //TimeMeeting 종료 시간
    this.tmEPList = [];               //TimeMeeting 사용 가능 장비 목록
    this.conSourceList = [];
    this.conEPList = [];              //contact 사용 가능 장비 목록
    this.MLList = [];
    this.normalSourceList = [];
    this.normalEPList = [];           //normal 사용 가능 장비 목록

    this.init();

}

util.inherits(inRoomApi,EventEmitter);

inRoomApi.prototype.init = function(){
    const self = this;

    self.xapi = null;

    return self.connect()
        .then((status) =>{
            console.log("proto status ",status , self.connectedStatus);
            self.onReady();
            return;
        })
        .catch((err) => {
            console.error(err);
        })
}

//connect to ssh service on endpoints
inRoomApi.prototype.connect = function() {
    var self = this;
    return new Promise((resolve, reject) => {
        self.xapi = jsxapi.connect('ssh://' + self.endpoint.ip, {
            username: self.endpoint.id,
            password: self.endpoint.password,
            keepaliveInterval : 4000
        });
        self.onError();
        resolve ("proto Connection opening.........." , self.endpoint.ip)
            .catch ((err) => {
                reject (console.error(err));
            });
    });


}

//Load event monitoring after connecting via ssh to endpoint
inRoomApi.prototype.onReady =  function(){
    const self = this;
    self.xapi.on('ready', () => {
        console.log("proto connexion successful!" , self.endpoint.ip);
        self.connectedStatus = "true";
        self.webexMeeting();
        return self;
    })
};

inRoomApi.prototype.onError =  function(){

    const self = this;
    self.xapi.on('error', (err) => {
        console.error(`proto connexion failed: ${err}, exiting`);
        console.log("err",err);
        if(err=="client-timeout" || err=="client-authentication" || err=="client-socket" || err.toString().indexOf("at position 0 in state STOP")!=-1){
          setTimeout(function(){
              self.init();
          }, 4000)
        }

    });

};


//event monitors for webex meetings
inRoomApi.prototype.webexMeeting = function(){
    const self =this;

    this.initPanel("CommonPanel");

    self.xapi.feedback.on('Status Call', data => {

       if(data.length!=undefined){
         if(data[0]['Status']!=undefined){
           if(data[0]['Status']=="Connected"){
             this.initPanel("CommonPanel");
           }else if(data[0]['Status']=="Disconnecting"){
             this.initPanel("ContactPanel");
           }
         }
       }

    });

    self.xapi.event.on('Userinterface Extensions Panel clicked', (pevent) => {
      this.initPanel(pevent.PanelId);
    });

    self.xapi.event.on('UserInterface Message Prompt Response',(ePrompt) => {
      this.initPrompt(ePrompt);
    });

    self.xapi.event.on('UserInterface Extensions Widget Action', (wevent) => {
      var eType = wevent.Type;
      var eWidgetId = wevent.WidgetId;

      if("clicked"==eType){
        this.initWidget(wevent);
      }

    });
}

//InformationPanel 오픈시 데이터 초기화
inRoomApi.prototype.initPanel = function(panelId){

  const self = this;

  switch(panelId){
    case "ContactPanel"     : initContactPanel();     break;  //임원주소록
    case "MeetingListPanel" : initMeetingListPanel(); break;  //회의목록
    case "NormalPanel"      : initNormalPanel();      break;  //코덱주소록
    case "CommonPanel"      : initCommonPanel();      break;
    default : break;
  }

  function initContactPanel(){
    let xmlcont = createContactPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initContactPanel Error : ",err);
    });
  }

  function initMeetingListPanel(){
    let xmlcont = createMeetingListPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initMeetingListPanel Error : ",err);
    });
  }

  function initCommonPanel(){
    let xmlcont = createCommonPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initCommonPanel Error : ",err);
    });
  }

  function initNormalPanel(){
    let xmlcont = createNormalPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initNormalPanel Error : ",err);
    });
  }

  //---------------------------------------------------------------------------------------------------------------------------------

  function createCommonPanel(){
    let xRoot = builder.create('Extensions');
    xRoot.ele('Version', '1.5');

    // 4.주소록
    if("Y"==self.endpoint.device_officer){
      let xPanel_sub4 = xRoot.ele('Panel');
      xPanel_sub4.ele('PanelId','ContactPanel');
      xPanel_sub4.ele('Type','Statusbar');
      xPanel_sub4.ele('Icon','Handset');
      xPanel_sub4.ele('Order','4');
      xPanel_sub4.ele('Color','#ffb400');
      xPanel_sub4.ele('Name',"임원 주소록");

      let xPage_sub4 = xPanel_sub4.ele('Page');
      xPage_sub4.ele('Name','임원 주소록');
      xPage_sub4.ele('Options');
    }

    if("Y"==self.endpoint.device_open){
      let xPanel_sub5 = xRoot.ele('Panel');
      xPanel_sub5.ele('PanelId','NormalPanel');
      xPanel_sub5.ele('Type','Statusbar');
      xPanel_sub5.ele('Icon','Handset');
      xPanel_sub5.ele('Order','5');
      xPanel_sub5.ele('Color','#ff503c');
      xPanel_sub5.ele('Name',"회의실 주소록");

      let xPage_sub5 = xPanel_sub5.ele('Page');
      xPage_sub5.ele('Name','회의실 주소록');
      xPage_sub5.ele('Options');
    }

    let xPanel_sub6 = xRoot.ele('Panel');
    xPanel_sub6.ele('PanelId','MeetingListPanel');
    xPanel_sub6.ele('Type','Statusbar');
    xPanel_sub6.ele('Icon','Lightbulb');
    xPanel_sub6.ele('Order','6');
    xPanel_sub6.ele('Color','#ff7033');
    xPanel_sub6.ele('Name',"회의 목록");

    let xPage_sub6 = xPanel_sub6.ele('Page');
    xPage_sub6.ele('Name','회의 목록');
    xPage_sub6.ele('Options');

    return xRoot.end({pretty:true});

  }

  function createContactPanel(){                        // 임원 미팅 패널 생성
    let epip = self.endpoint.ip;
    self.conSourceList = [];
    self.conEPList = [];

    let res = request('GET', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/getDeviceContact?epip='+epip, {
      'content-type' : 'application/json',
      'charset' : 'UTF-8'
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);
    let retResult = retBody.result;
    let retItem = retBody.item;

    let xRoot = builder.create('Extensions');
    xRoot.ele('Version', '1.5');

    let xPanel_sub6 = xRoot.ele('Panel');
    xPanel_sub6.ele('PanelId','MeetingListPanel');
    xPanel_sub6.ele('Type','Statusbar');
    xPanel_sub6.ele('Icon','Lightbulb');
    xPanel_sub6.ele('Order','6');
    xPanel_sub6.ele('Color','#ff7033');
    xPanel_sub6.ele('Name',"회의 목록");

    let xPage_sub6 = xPanel_sub6.ele('Page');
    xPage_sub6.ele('Name','회의 목록');
    xPage_sub6.ele('Options');

    if("Y"==self.endpoint.device_open){
      let xPanel_sub5 = xRoot.ele('Panel');
      xPanel_sub5.ele('PanelId','NormalPanel');
      xPanel_sub5.ele('Type','Statusbar');
      xPanel_sub5.ele('Icon','Handset');
      xPanel_sub5.ele('Order','5');
      xPanel_sub5.ele('Color','#ff503c');
      xPanel_sub5.ele('Name',"회의실 주소록");

      let xPage_sub5 = xPanel_sub5.ele('Page');
      xPage_sub5.ele('Name','회의실 주소록');
      xPage_sub5.ele('Options');
    }

    if("Y"==self.endpoint.device_officer){
      let xPanel = xRoot.ele('Panel');
      xPanel.ele('PanelId','ContactPanel');
      xPanel.ele('Type','Statusbar');
      xPanel.ele('Icon','Handset');
      xPanel.ele('Order','4');
      xPanel.ele('Color','#ffb400');
      xPanel.ele('Name',"임원 주소록");

      for(let i=0;i<retItem.length;i++){

        let xPage_ep_group = xPanel.ele('Page');
        xPage_ep_group.ele('Name',retItem[i].ep_group_name);

        let xRow_detail = xPage_ep_group.ele('Row');
        xRow_detail.ele('Name','연결목록');

        let xRow_detail_widget = xRow_detail.ele('Widget');
        xRow_detail_widget.ele('WidgetId','SystemMessage');
        xRow_detail_widget.ele('Name','통화 연결 상대를 선택해주세요');
        xRow_detail_widget.ele('Type','Text');
        xRow_detail_widget.ele('Options','size=4;fontSize=small;align=center');

        let xRow_call_row = xPage_ep_group.ele('Row');
        xRow_call_row.ele('Name','');

        let xRow_call_btn = xRow_call_row.ele('Widget');
        xRow_call_btn.ele('WidgetId','CallBtn');
        xRow_call_btn.ele('Name','☎전화걸기');
        xRow_call_btn.ele('Type','Button');
        xRow_call_btn.ele('Options','size=2');

        let xRow_ep_group = xPage_ep_group.ele('Row');
        xRow_ep_group.ele('Name','장비');
        let tempEp = retItem[i].endpoint;


        //ep_id 로 버튼 생성
        for(var j=0;j<tempEp.length;j++){

          let ep_id = tempEp[j].ep_id;
          let ep_name = tempEp[j].ep_name;
          let xRow_ep = xRow_ep_group.ele('Widget');

          xRow_ep.ele('WidgetId','CON_'+ep_id);
          xRow_ep.ele('Name',ep_name);
          xRow_ep.ele('Type','Button');
          xRow_ep.ele('Options','size=4');

          self.conSourceList.push(tempEp[j]);

        }

        let xRow_call_row_b = xPage_ep_group.ele('Row');
        xRow_call_row_b.ele('Name','');

        let xRow_call_btn_b = xRow_call_row_b.ele('Widget');
        xRow_call_btn_b.ele('WidgetId','CallBtn');
        xRow_call_btn_b.ele('Name','☎전화걸기');
        xRow_call_btn_b.ele('Type','Button');
        xRow_call_btn_b.ele('Options','size=2');

      }
    }

    return xRoot.end({pretty:true});

  }

  function createMeetingListPanel(){                          //주소록 회의 내역

    let epip = self.endpoint.ip;

    let res = request('GET', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/searchContactMeeting?epip='+epip, {
      'content-type' : 'application/json',
      'charset' : 'UTF-8'
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);
    let retResult = retBody.result;
    let retItem = retBody.item;

    let xRoot = builder.create('Extensions');
    xRoot.ele('Version', '1.5');

    // 4.주소록
    if("Y"==self.endpoint.device_officer){
      let xPanel_sub4 = xRoot.ele('Panel');
      xPanel_sub4.ele('PanelId','ContactPanel');
      xPanel_sub4.ele('Type','Statusbar');
      xPanel_sub4.ele('Icon','Handset');
      xPanel_sub4.ele('Order','4');
      xPanel_sub4.ele('Color','#ffb400');
      xPanel_sub4.ele('Name',"임원 주소록");

      let xPage_sub4 = xPanel_sub4.ele('Page');
      xPage_sub4.ele('Name','임원 주소록');
      xPage_sub4.ele('Options');
    }

    if("Y"==self.endpoint.device_open){
      let xPanel_sub5 = xRoot.ele('Panel');
      xPanel_sub5.ele('PanelId','NormalPanel');
      xPanel_sub5.ele('Type','Statusbar');
      xPanel_sub5.ele('Icon','Handset');
      xPanel_sub5.ele('Order','5');
      xPanel_sub5.ele('Color','#ff503c');
      xPanel_sub5.ele('Name',"회의실 주소록");

      let xPage_sub5 = xPanel_sub5.ele('Page');
      xPage_sub5.ele('Name','회의실 주소록');
      xPage_sub5.ele('Options');
    }

    // 5.회의목록
    let xPanel = xRoot.ele('Panel');
    xPanel.ele('PanelId','MeetingListPanel');
    xPanel.ele('Type','Statusbar');
    xPanel.ele('Icon','Lightbulb');
    xPanel.ele('Order','6');
    xPanel.ele('Color','#ff7033');
    xPanel.ele('Name',"회의 목록");

    let xPage = xPanel.ele('Page');
    xPage.ele('Name','회의 목록');
    xPage.ele('Options');


    self.MLList = [];
    for(let i=0;i<retItem.length;i++){

      self.MLList.push(retItem[i]);

      let xRow = xPage.ele('Row');
      xRow.ele('Name',retItem[i].add_date);

      let xWidget = xRow.ele('Widget');
      xWidget.ele('WidgetId','ML_'+retItem[i].seq);
      xWidget.ele('Name',retItem[i].name);
      xWidget.ele('Type','Button');
      xWidget.ele('Options','size=4');

    }

    return xRoot.end({pretty:true});

  }

  function createNormalPanel(){                         // 코덱 미팅 패널 생성

    let epip = self.endpoint.ip;

    let res = request('GET', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/getDeviceNormal?epip='+epip, {
      'content-type' : 'application/json',
      'charset' : 'UTF-8'
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);
    let retResult = retBody.result;
    let retItem = retBody.item;

    let xRoot = builder.create('Extensions');
    xRoot.ele('Version', '1.5');

    // 4.주소록
    let xPanel_sub4 = xRoot.ele('Panel');
    xPanel_sub4.ele('PanelId','ContactPanel');
    xPanel_sub4.ele('Type','Statusbar');
    xPanel_sub4.ele('Icon','Handset');
    xPanel_sub4.ele('Order','4');
    xPanel_sub4.ele('Color','#ffb400');
    xPanel_sub4.ele('Name',"임원 주소록");

    let xPage_sub4 = xPanel_sub4.ele('Page');
    xPage_sub4.ele('Name','임원 주소록');
    xPage_sub4.ele('Options');

    let xPanel_sub6 = xRoot.ele('Panel');
    xPanel_sub6.ele('PanelId','MeetingListPanel');
    xPanel_sub6.ele('Type','Statusbar');
    xPanel_sub6.ele('Icon','Lightbulb');
    xPanel_sub6.ele('Order','6');
    xPanel_sub6.ele('Color','#ff7033');
    xPanel_sub6.ele('Name',"회의 목록");

    let xPage_sub6 = xPanel_sub6.ele('Page');
    xPage_sub6.ele('Name','회의 목록');
    xPage_sub6.ele('Options');

    let xPanel = xRoot.ele('Panel');
    xPanel.ele('PanelId','NormalPanel');
    xPanel.ele('Type','Statusbar');
    xPanel.ele('Icon','Handset');
    xPanel.ele('Order','5');
    xPanel.ele('Color','#ff503c');
    xPanel.ele('Name',"회의실 주소록");

    for(let i=0;i<retItem.length;i++){

      let xPage_ep_group = xPanel.ele('Page');
      xPage_ep_group.ele('Name',retItem[i].ep_group_name);

      let xRow_detail = xPage_ep_group.ele('Row');
      xRow_detail.ele('Name','연결목록');

      let xRow_detail_widget = xRow_detail.ele('Widget');
      xRow_detail_widget.ele('WidgetId','SystemMessage_normal');
      xRow_detail_widget.ele('Name','통화 연결 상대를 선택해주세요');
      xRow_detail_widget.ele('Type','Text');
      xRow_detail_widget.ele('Options','size=4;fontSize=small;align=center');

      let xRow_call_row = xPage_ep_group.ele('Row');
      xRow_call_row.ele('Name','');

      let xRow_call_btn = xRow_call_row.ele('Widget');
      xRow_call_btn.ele('WidgetId','CallBtnNoraml');
      xRow_call_btn.ele('Name','☎전화걸기');
      xRow_call_btn.ele('Type','Button');
      xRow_call_btn.ele('Options','size=2');

      let xRow_ep_group = xPage_ep_group.ele('Row');
      xRow_ep_group.ele('Name','장비');
      let tempEp = retItem[i].endpoint;


      //ep_id 로 버튼 생성
      for(var j=0;j<tempEp.length;j++){

        let ep_id = tempEp[j].ep_id;
        let ep_name = tempEp[j].ep_name;
        let xRow_ep = xRow_ep_group.ele('Widget');

        xRow_ep.ele('WidgetId','NORMAL_'+ep_id);
        xRow_ep.ele('Name',ep_name);
        xRow_ep.ele('Type','Button');
        xRow_ep.ele('Options','size=4');

        self.normalSourceList.push(tempEp[j]);

      }

      let xRow_call_row_b = xPage_ep_group.ele('Row');
      xRow_call_row_b.ele('Name','');

      let xRow_call_btn_b = xRow_call_row_b.ele('Widget');
      xRow_call_btn_b.ele('WidgetId','CallBtnNoraml');
      xRow_call_btn_b.ele('Name','☎전화걸기');
      xRow_call_btn_b.ele('Type','Button');
      xRow_call_btn_b.ele('Options','size=2');

    }

    return xRoot.end({pretty:true});

  }

}

inRoomApi.prototype.initWidget = function(wevent){

  const self = this;
  if(wevent.Type == 'clicked'){
    let wVal = wevent.Value;

    if(-1!=wevent.WidgetId.toString().indexOf("CON_")){
      con_ep_button(wevent.WidgetId);
    }else if(-1!=wevent.WidgetId.toString().indexOf("NORMAL_")){
      normal_ep_button(wevent.WidgetId);
    }else if(-1!=wevent.WidgetId.toString().indexOf("ML_")){
      reconnect_meeting(wevent.WidgetId);
    }else{
      //일반 버튼
      switch(wevent.WidgetId){
        case "CallBtn"              : call_btn_event();           break;
        case "CallBtnNoraml"        : call_btn_event_normal();    break;
      }
    }
  }


  function epButton(epId){            //장비 버튼 이벤트
      //getValue 없을 경우 현재 상태값 변수 추가
      let tempCheck = false;
      for (var i = 0; i < self.tmEPList.length; i++) {
        if(self.tmEPList[i]==epId){
          tempCheck = true;
          self.tmEPList.splice(i,1);
          break;
        }
      }

      if(tempCheck){
        self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:epId , Value:'inactive'}).catch ((err) => {
            console.error("epButton Error 1: ",err);
        });
      }else{
        self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:epId , Value:'active'}).catch ((err) => {
            console.error("epButton Error 2: ",err);
        });
        self.tmEPList.push(epId);
      }

  }

  //---------------------------------------- DX 주소록 기능 ----------------------------------------
  //장비 버튼 이벤트
  function con_ep_button(epId){

    var subepId = epId.substring(4);
    let tempCheck = false;

    for (var i = 0; i < self.conEPList.length; i++) {
      if(self.conEPList[i]==subepId){
        tempCheck = true;
        self.conEPList.splice(i,1);
        break;
      }
    }

    if(tempCheck){
      self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:epId , Value:'inactive'}).catch ((err) => {
          console.error("con_ep_button Error 1: ",err);
      });
    }else{
      self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:epId , Value:'active'}).catch ((err) => {
          console.error("con_ep_button Error 2: ",err);
      });
      self.conEPList.push(subepId);
    }

    con_text_event();
  }

  //선택된 장비 이벤트
  function con_text_event(){

    let tempString = "";
    for(var i=0;i<self.conEPList.length;i++){
      for(var j=0;j<self.conSourceList.length;j++){
        if(self.conEPList[i]==self.conSourceList[j].ep_id){
          var subName = self.conSourceList[j].ep_name.substr(self.conSourceList[j].ep_name.lastIndexOf(" ")+1)
          tempString = tempString + subName + ",";
          break;
        }
      }

    }

    self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:'SystemMessage',Value:tempString}).catch ((err) => {
        console.error("con_text_event Error 1: ",err);
    });

  }

  function call_btn_event(){

    //step1.TM호출
    let param = {};
    param['host'] = self.endpoint.ip;
    param['eplist'] = self.conEPList;

    if(param.eplist.length>0){

      if(1==param.eplist.length){ //직접콜
        param['type'] = 'DIRECT';
      }else{
        param['type'] = 'NORMAL';
      }

      jsonstrparam = JSON.stringify(param);
      let res = request('POST', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/addContactMeeting', {
        'content-type' : 'application/json',
        'charset' : 'UTF-8',
        'body' : jsonstrparam
      });

      //step2.res 데이터 로드

      let strBody = res.getBody('utf8');
      let retBody = JSON.parse(strBody);
      let retStatus = retBody.result;

      // if('NORMAL'==param.type){
      if(true){

        if("result.fail.call"==retStatus){
            self.xapi.command('UserInterface Message Alert Display',{'Text':"회의 생성에 실패했습니다." , 'Duration':5}).catch ((err) => {
                console.error("call_btn_event Error 1: ",err);
            });
        }else if("result.fail.cospaces"==retStatus){
            self.xapi.command('UserInterface Message Alert Display',{'Text':"회의실 생성에 실패했습니다." , 'Duration':5}).catch ((err) => {
                console.error("call_btn_event Error 2: ",err);
            });
        }else if("result.success.normal"==retStatus){

            let retSeq = retBody.data.seq;
            let call_name = retBody.data.call_name;
            let call_id = retBody.data.callId;

            self.xapi.command('Dial',{'Number':call_id+defaultSettingJson['setting']['callsuffix']}).catch ((err) => {
                console.error("call_btn_event Error 3: ",err);
            });


            for(let i=0;i<retBody.data.ep_list.length;i++){
              try{
                  let ep_ip = retBody.data.ep_list[i]['epip'];
                  let ep_id = retBody.data.ep_list[i]['id'];
                  let ep_pw = retBody.data.ep_list[i]['pw'];
                  if(ep_pw=="" || ep_pw==null){
                    ep_pw = '';
                  }

                  if(true){
                    let tempXapi = jsxapi.connect("ssh://"+ep_ip, {
                      username: ep_id,
                      password: ''
                    });

                    tempXapi.on('error', (err) => {
                        console.error(`connection failed: ${err}, exiting`);
                        //process.exit(1);
                    });

                    tempXapi.command('UserInterface Message Prompt Display',{'Text':call_name ,'FeedbackId':'INCALL_'+retSeq,'Option.1':'수락' ,'Option.2':'거절','Duration':30}).catch ((err) => {
                        console.error("tempXapi call_btn_event Error 1: ",err);
                    });
                  }
                }catch(Exception){
                  console.log(Exception);
                }finally{
                  continue;
                }
            }

        }

      }

    }else{
      //장비 개수 에러 처리
      self.xapi.command('UserInterface Message Alert Display',{ 'Text':"선택된 대상자가 없습니다." , 'Duration':5}).catch ((err) => {
          console.error("call_btn_event Error 4: ",err);
      });

    }

  }

  //---------------------------------------- 일반 주소록 기능 ----------------------------------------
  function normal_ep_button(epId){

        var subepId = epId.substring(7);
        let tempCheck = false;

        for (var i = 0; i < self.normalEPList.length; i++) {
          if(self.normalEPList[i]==subepId){
            tempCheck = true;
            self.normalEPList.splice(i,1);
            break;
          }
        }

        if(tempCheck){
          self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:epId , Value:'inactive'}).catch ((err) => {
              console.error("normal_ep_button Error 1: ",err);
          });
        }else{
          self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:epId , Value:'active'}).catch ((err) => {
              console.error("normal_ep_button Error 2: ",err);
          });
          self.normalEPList.push(subepId);
        }

        console.log("self.normalEPList : " ,self.normalEPList);

        normal_text_event();
  }

  function normal_text_event(){

    let tempString = "";
    for(var i=0;i<self.normalEPList.length;i++){
      for(var j=0;j<self.normalSourceList.length;j++){
        if(self.normalEPList[i]==self.normalSourceList[j].ep_id){
          tempString = tempString + self.normalSourceList[j].ep_name+",";
          break;
        }
      }

    }

    self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:'SystemMessage_normal',Value:tempString}).catch ((err) => {
        console.error("normal_text_event Error 1: ",err);
    });

  }

  function call_btn_event_normal(){

    //step1.TM호출
    let param = {};
    param['host'] = self.endpoint.ip;
    param['eplist'] = self.normalEPList;

    if(param.eplist.length>0){

      if(1==param.eplist.length){ //직접콜
        param['type'] = 'DIRECT';
      }else{
        param['type'] = 'NORMAL';
      }

      jsonstrparam = JSON.stringify(param);
      let res = request('POST', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/addNoramlMeeting', {
        'content-type' : 'application/json',
        'charset' : 'UTF-8',
        'body' : jsonstrparam
      });

      //step2.res 데이터 로드

      let strBody = res.getBody('utf8');
      let retBody = JSON.parse(strBody);
      let retStatus = retBody.result;

      // if('NORMAL'==param.type){
      if(true){

        if("result.fail.call"==retStatus){
            self.xapi.command('UserInterface Message Alert Display',{'Text':"회의 생성에 실패했습니다." , 'Duration':5}).catch ((err) => {
                console.error("call_btn_event_normal Error 1: ",err);
            });
        }else if("result.fail.cospaces"==retStatus){
            self.xapi.command('UserInterface Message Alert Display',{'Text':"회의실 생성에 실패했습니다." , 'Duration':5}).catch ((err) => {
                console.error("call_btn_event_normal Error 2: ",err);
            });
        }else if("result.success.normal"==retStatus){

            let retSeq = retBody.data.seq;
            let call_name = retBody.data.call_name;
            let call_id = retBody.data.callId;

            self.xapi.command('Dial',{'Number':call_id+defaultSettingJson['setting']['callsuffix']}).catch ((err) => {
              console.error("call_btn_event_normal Error 3: ",err);
            });


            for(let i=0;i<retBody.data.ep_list.length;i++){
              try{
                  let ep_ip = retBody.data.ep_list[i]['epip'];
                  let ep_id = retBody.data.ep_list[i]['id'];
                  let ep_pw = retBody.data.ep_list[i]['pw'];
                  if(ep_pw=="" || ep_pw==null){
                    ep_pw = '';
                  }

                  if(true){
                    let tempXapi = jsxapi.connect("ssh://"+ep_ip, {
                      username: ep_id,
                      password: ''
                    });

                    tempXapi.on('error', (err) => {
                        console.error(`connection failed: ${err}, exiting`);
                        //process.exit(1);
                    });

                    tempXapi.command('UserInterface Message Prompt Display',{'Text':call_name ,'FeedbackId':'INCALL_'+retSeq,'Option.1':'수락' ,'Option.2':'거절','Duration':30}).catch ((err) => {
                      console.error("tempXapi call_btn_event_normal Error 1: ",err);
                    });
                  }
                }catch(Exception){
                  console.log(Exception);
                }finally{
                  continue;
                }
            }

        }

      }

    }else{
      //장비 개수 에러 처리
      self.xapi.command('UserInterface Message Alert Display',{ 'Text':"선택된 대상자가 없습니다." , 'Duration':5}).catch ((err) => {
          console.error("call_btn_event_normal Error 4: ",err);
      });

    }

  }

  //---------------------------------------- 주소록 목록 재 연결 기능 ----------------------------------------
  function reconnect_meeting(widgetId){
    var meet_id = widgetId.substring(3);

    for(var i=0;i<self.MLList.length;i++){
      if(meet_id == self.MLList[i].seq){

        let param = {};
        param['seq'] = meet_id;
        jsonstrparam = JSON.stringify(param);

        let res = request('POST', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/reconnectMeeting', {
          'content-type' : 'application/json',
          'charset' : 'UTF-8',
          'body' : jsonstrparam
        });

        let strBody = res.getBody('utf8');
        let retBody = JSON.parse(strBody);

        let retCallId = retBody.call_id;

        self.xapi.command('Dial',{'Number':retCallId+defaultSettingJson['setting']['callsuffix']}).catch ((err) => {
            console.error("reconnect_meeting Error : ",err);
            self.xapi.command('UserInterface Message Alert Display',{ 'Text':"알수 없는 에러가 발생하였습니다." , 'Duration':5});
        });;
      }
    }

  }

}

inRoomApi.prototype.initPrompt = function(ePrompt){

  const self = this;
  let feedbackId = ePrompt.FeedbackId;

  if(1==ePrompt.OptionId){

    if(-1!=feedbackId.toString().indexOf("INCALL_")){
      inCallFunction(feedbackId);
    }

  }

  function inCallFunction(feedbackId){

    let epip = self.endpoint.ip;

    let seqId = feedbackId.substring(7);
    let param = {};
    param['seq'] = seqId;
    jsonstrparam = JSON.stringify(param);

    let res = request('POST', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/inCallMeeting'+'?epip='+epip, {
      'content-type' : 'application/json',
      'charset' : 'UTF-8',
      'body' : jsonstrparam
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);

    console.log(">>>>>>>>>>>>>>>>>>>>>>",retBody);
    let retCallId = retBody.call_id;

    self.xapi.command('Dial',{'Number':retCallId+defaultSettingJson['setting']['callsuffix']}).catch ((err) => {
        console.error("inCallFunction Error : ",err);
    });

  }

}

module.exports = inRoomApi;
