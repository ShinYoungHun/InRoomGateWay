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

function inRoomApi(endpoint){

    this.tempTMIp = "192.168.0.9"
    this.tempTMPort = "8000"
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

    // self.xapi.status.get('Call').then((value) => {
    //   console.log(value);
    // });

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
      //console.log(ePrompt);
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
    case "InformationPanel" : initInformationPanel(); break;
    case "TimeMeetingPanel" : initTimeMeetingPanel(); break;
    case "FastMeetingPanel" : initFastMeetingPanel(); break;
    case "ContactPanel"     : initContactPanel();     break;
    case "MeetingListPanel" : initMeetingListPanel(); break;
    case "NormalPanel"      : initNormalPanel();      break;
    case "CommonPanel"      : initCommonPanel();      break;
    default : break;
  }

  function initInformationPanel(){//InformationPanel 초기화
    let xmlcont = createInformationPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initInformationPanel Error : ",err);
    });
  }

  function initTimeMeetingPanel(){//TimeMeetingPanel 초기화
    let xmlcont = createTimeMeetingPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initTimeMeetingPanel Error : ",err);
    });
  }

  function initFastMeetingPanel(){
    let xmlcont = createFastMeetingPanel();
    self.xapi.command('UserInterface Extensions Set',{ ConfigId: 'default' },entities.encodeNonASCII(xmlcont)).catch ((err) => {
        console.error("initFastMeetingPanel Error : ",err);
    });
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

  function createInformationPanel(){  // 회의 예약 현황
    let epip = self.endpoint.ip;

    let res = request('GET', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/checkReservation'+'?epip='+epip, {
      'content-type' : 'application/json',
      'charset' : 'UTF-8'
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);
    let retResult = retBody.result;
    let retItem = retBody.item;

    let curDate = new Date();
    let curYear = curDate.getFullYear();
    let curMonth = curDate.getMonth()+1;
    let curDay = curDate.getDate();

    let xRoot = builder.create('Extensions');
    xRoot.ele('Version', '1.5');

    let xPanel = xRoot.ele('Panel');
    xPanel.ele('PanelId','InformationPanel');
    xPanel.ele('Type','Statusbar');
    xPanel.ele('Icon','Info');
    xPanel.ele('Order','1');
    xPanel.ele('Color','#D541D8');
    xPanel.ele('Name',"예약확인");

    let xPanel_sub1 = xRoot.ele('Panel');
    xPanel_sub1.ele('PanelId','TimeMeetingPanel');
    xPanel_sub1.ele('Type','Statusbar');
    xPanel_sub1.ele('Icon','Concierge');
    xPanel_sub1.ele('Order','2');
    xPanel_sub1.ele('Color','#FF7033');
    xPanel_sub1.ele('Name',"회의예약");

    let xPage_sub1 = xPanel_sub1.ele('Page');
    xPage_sub1.ele('Name','회의예약');

    let xPanel_sub2 = xRoot.ele('Panel');
    xPanel_sub2.ele('PanelId','FastMeetingPanel');
    xPanel_sub2.ele('Type','Statusbar');
    xPanel_sub2.ele('Icon','Lightbulb');
    xPanel_sub2.ele('Order','3');
    xPanel_sub2.ele('Color','#FF3D67');
    xPanel_sub2.ele('Name',"즉시예약");

    let xPage_sub2 = xPanel_sub2.ele('Page');
    xPage_sub2.ele('Name','즉시예약');

    let xPanel_sub3 = xRoot.ele('Panel');
    xPanel_sub3.ele('PanelId','ContactPanel');
    xPanel_sub3.ele('Type','Statusbar');
    xPanel_sub3.ele('Icon','Lightbulb');
    xPanel_sub3.ele('Order','4');
    xPanel_sub3.ele('Color','#07C1E4');
    xPanel_sub3.ele('Name',"주소록");

    let xPage_sub3 = xPanel_sub3.ele('Page');
    xPage_sub3.ele('Name','주소록');

    let xPage = xPanel.ele('Page');
    xPage.ele('Name',"예약확인");

    let xRow = xPage.ele('Row');
    xRow.ele('Name','Message');

    let timeWidget = xRow.ele('Widget');
    timeWidget.ele('WidgetId','TimeWidget');
    timeWidget.ele('Name',curYear+"년 "+curMonth+"월 "+curDay+"일");
    timeWidget.ele('Type','Text');
    timeWidget.ele('Options','size=4;fontSize=normal;align=center');

    let xRow2 = xPage.ele('Row');
    xRow2.ele('Name','예약정보');

    for(let i=0;i<retItem.length;i++){

      let tempWidget = xRow2.ele('Widget');
      let tempName = retItem[i].resv_name;
      let tempStart = dateFormat(retItem[i].start_date,'mm/dd HH:MM');
      let tempEnd =dateFormat(retItem[i].end_date,'mm/dd HH:MM');

      tempWidget.ele('WidgetId','Reserve_Info_'+i);
      tempWidget.ele('Name', tempName+" ("+tempStart+" ~ "+tempEnd+")");
      tempWidget.ele('Type','Text');
      tempWidget.ele('Options','size=4;fontSize=small;align=left');

    }

    return xRoot.end({pretty:true});

  }

  function createTimeMeetingPanel(){

      let curDate = new Date();
      self.tmStartDate = curDate;
      self.tmEndDate = curDate;
      let curDay = dateFormat(curDate,'yy년 mm월 dd일');
      let curSTime = dateFormat(curDate,'HH:MM');
      let curETime = dateFormat(curDate,'HH:MM');

      let res = request('GET', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/getDeviceInfo', {
      //let res = request('GET', 'http://127.0.0.1:8000/api/v1/getDeviceInfo', {
        'content-type' : 'application/json',
        'charset' : 'UTF-8'
      });

      let strBody = res.getBody('utf8');
      let retBody = JSON.parse(strBody);
      let retResult = retBody.result;
      let retItem = retBody.item;

      let xRoot = builder.create('Extensions');
      xRoot.ele('Version', '1.5');

      let xPanel_sub1 = xRoot.ele('Panel');
      xPanel_sub1.ele('PanelId','InformationPanel');
      xPanel_sub1.ele('Type','Statusbar');
      xPanel_sub1.ele('Icon','Info');
      xPanel_sub1.ele('Order','1');
      xPanel_sub1.ele('Color','#D541D8');
      xPanel_sub1.ele('Name',"예약확인");

      let xPage_sub1 = xPanel_sub1.ele('Page');
      xPage_sub1.ele('Name',"예약확인");

      let xPanel_sub2 = xRoot.ele('Panel');
      xPanel_sub2.ele('PanelId','FastMeetingPanel');
      xPanel_sub2.ele('Type','Statusbar');
      xPanel_sub2.ele('Icon','Lightbulb');
      xPanel_sub2.ele('Order','3');
      xPanel_sub2.ele('Color','#FF3D67');
      xPanel_sub2.ele('Name',"즉시예약");

      let xPage_sub2 = xPanel_sub2.ele('Page');
      xPage_sub2.ele('Name','즉시예약');

      let xPanel_sub3 = xRoot.ele('Panel');
      xPanel_sub3.ele('PanelId','ContactPanel');
      xPanel_sub3.ele('Type','Statusbar');
      xPanel_sub3.ele('Icon','Lightbulb');
      xPanel_sub3.ele('Order','4');
      xPanel_sub3.ele('Color','#07C1E4');
      xPanel_sub3.ele('Name',"주소록");

      let xPage_sub3 = xPanel_sub3.ele('Page');
      xPage_sub3.ele('Name','주소록');

      let xPanel = xRoot.ele('Panel');
      xPanel.ele('PanelId','TimeMeetingPanel');
      xPanel.ele('Type','Statusbar');
      xPanel.ele('Icon','Concierge');
      xPanel.ele('Order','2');
      xPanel.ele('Color','#FF7033');
      xPanel.ele('Name',"회의예약");

      let xPage_main = xPanel.ele('Page');
      xPage_main.ele('Name','회의예약');

      let xRow_main_1 = xPage_main.ele('Row');
      xRow_main_1.ele('Name','Message');
      let xRow_main_2 = xPage_main.ele('Row');
      xRow_main_2.ele('Name','회의 시간');
      let xRow_main_3 = xPage_main.ele('Row');
      xRow_main_3.ele('Name','회의 날짜 [월/일]');
      let xRow_main_4 = xPage_main.ele('Row');
      xRow_main_4.ele('Name','회의 시작 시간 [시/분]');
      let xRow_main_5 = xPage_main.ele('Row');
      xRow_main_5.ele('Name','회의 종료 시간 [시/분]');
      let xRow_main_6 = xPage_main.ele('Row');
      xRow_main_6.ele('Name','빈 회의실 확인');

      let xRow_widget_1 = xRow_main_1.ele('Widget');
      xRow_widget_1.ele('WidgetId','SystemMessage');
      xRow_widget_1.ele('Name','회의 시간을 설정해 주세요');
      xRow_widget_1.ele('Type','Text');
      xRow_widget_1.ele('Options','size=4;fontSize=small;align=center');

      let xRow_widget_2 = xRow_main_2.ele('Widget');
      xRow_widget_2.ele('WidgetId','TimeMessage');
      xRow_widget_2.ele('Name',curDay+' '+curSTime+' ~ '+curETime);
      xRow_widget_2.ele('Type','Text');
      xRow_widget_2.ele('Options','size=4;fontSize=small;align=center');

      let xRow_widget_3_1 = xRow_main_3.ele('Widget');
      xRow_widget_3_1.ele('WidgetId','StartMonth_Spinner');
      xRow_widget_3_1.ele('Type','Spinner');
      xRow_widget_3_1.ele('Options','size=2');

      let xRow_widget_3_2 = xRow_main_3.ele('Widget');
      xRow_widget_3_2.ele('WidgetId','StartDay_Spinner');
      xRow_widget_3_2.ele('Type','Spinner');
      xRow_widget_3_2.ele('Options','size=2');

      let xRow_widget_4_1 = xRow_main_4.ele('Widget');
      xRow_widget_4_1.ele('WidgetId','StartHour_Spinner');
      xRow_widget_4_1.ele('Type','Spinner');
      xRow_widget_4_1.ele('Options','size=2');

      let xRow_widget_4_2 = xRow_main_4.ele('Widget');
      xRow_widget_4_2.ele('WidgetId','StartMinute_Spinner');
      xRow_widget_4_2.ele('Type','Spinner');
      xRow_widget_4_2.ele('Options','size=2;style=vertical');

      let xRow_widget_5_1 = xRow_main_5.ele('Widget');
      xRow_widget_5_1.ele('WidgetId','EndHour_Spinner');
      xRow_widget_5_1.ele('Type','Spinner');
      xRow_widget_5_1.ele('Options','size=2');

      let xRow_widget_5_2 = xRow_main_5.ele('Widget');
      xRow_widget_5_2.ele('WidgetId','EndMinute_Spinner');
      xRow_widget_5_2.ele('Type','Spinner');
      xRow_widget_5_2.ele('Options','size=2;style=vertical');

      let xRow_widget_6 = xRow_main_6.ele('Widget');
      xRow_widget_6.ele('WidgetId','CheckRoom');
      xRow_widget_6.ele('Name','Button');
      xRow_widget_6.ele('Type','Button');
      xRow_widget_6.ele('Options','size=4');

      //EP_GROUP 으로 페이지 생성
      for(let i=0;i<retItem.length;i++){

        let xPage_ep_group = xPanel.ele('Page');
        xPage_ep_group.ele('Name',retItem[i].ep_group_name);

        let xRow_detail = xPage_ep_group.ele('Row');
        xRow_detail.ele('Name','Message');

        let xRow_detail_widget = xRow_detail.ele('Widget');
        xRow_detail_widget.ele('WidgetId','SystemMessage');
        xRow_detail_widget.ele('Name','회의실을 선택해 주세요');
        xRow_detail_widget.ele('Type','Text');
        xRow_detail_widget.ele('Options','size=4;fontSize=small;align=center');

        let xRow_ep_group = xPage_ep_group.ele('Row');
        xRow_ep_group.ele('Name','장비');
        let tempEp = retItem[i].endpoint;

        //ep_id 로 버튼 생성
        for(var j=0;j<tempEp.length;j++){

          let ep_id = tempEp[j].ep_id;
          let ep_name = tempEp[j].ep_name;
          let xRow_ep = xRow_ep_group.ele('Widget');

          xRow_ep.ele('WidgetId','TIME_'+ep_id);
          xRow_ep.ele('Name',ep_name);
          xRow_ep.ele('Type','Button');
          xRow_ep.ele('Options','size=2');

        }

      }

      let xPage_confirm = xPanel.ele('Page');
      xPage_confirm.ele('Name','회의실 예약');
      let xPage_confirm_row1 = xPage_confirm.ele('Row');
      xPage_confirm_row1.ele('Name','Message');
      let xPage_confirm_row2 = xPage_confirm.ele('Row');
      xPage_confirm_row2.ele('Name','선택된 회의실');
      let xPage_confirm_row3 = xPage_confirm.ele('Row');
      xPage_confirm_row3.ele('Name','회의 예약');

      let xPage_confirm_row1_Widget = xPage_confirm_row1.ele('Widget');
      xPage_confirm_row1_Widget.ele('WidgetId','SystemMessage');
      xPage_confirm_row1_Widget.ele('Name','선택된 회의실 정보를 확인 후 예약 버튼을 눌러 주세요');
      xPage_confirm_row1_Widget.ele('Type','Text');
      xPage_confirm_row1_Widget.ele('Options','size=4;fontSize=small;align=center');

      let xPage_confirm_row2_Widget = xPage_confirm_row2.ele('Widget');
      xPage_confirm_row2_Widget.ele('WidgetId','SelectedRoomMessage');
      xPage_confirm_row2_Widget.ele('Name','선택된 회의실 리스트');
      xPage_confirm_row2_Widget.ele('Type','Text');
      xPage_confirm_row2_Widget.ele('Options','size=2');

      let xPage_confirm_row2_Widget1 = xPage_confirm_row3.ele('Widget');
      xPage_confirm_row2_Widget1.ele('WidgetId','ClearRoom');
      xPage_confirm_row2_Widget1.ele('Name','초기화');
      xPage_confirm_row2_Widget1.ele('Type','Button');
      xPage_confirm_row2_Widget1.ele('Options','size=4;fontSize=small;align=center');

      let xPage_confirm_row2_Widget2 = xPage_confirm_row3.ele('Widget');
      xPage_confirm_row2_Widget2.ele('WidgetId','ReservationRoom');
      xPage_confirm_row2_Widget2.ele('Name','예약');
      xPage_confirm_row2_Widget2.ele('Type','Button');
      xPage_confirm_row2_Widget2.ele('Options','size=2');

      return xRoot.end({pretty:true});

  }

  function createFastMeetingPanel(){//FastMeetingPanel 초기화

      let curDate = new Date();
      curDate = dateFormat(curDate,'yy년 mm월 dd일 HH:MM');

      let xRoot = builder.create('Extensions');
      xRoot.ele('Version', '1.5');

      let xPanel_sub1 = xRoot.ele('Panel');
      xPanel_sub1.ele('PanelId','InformationPanel');
      xPanel_sub1.ele('Type','Statusbar');
      xPanel_sub1.ele('Icon','Info');
      xPanel_sub1.ele('Order','1');
      xPanel_sub1.ele('Color','#D541D8');
      xPanel_sub1.ele('Name',"예약확인");

      let xPage_sub1 = xPanel_sub1.ele('Page');
      xPage_sub1.ele('Name',"예약확인");

      let xPanel_sub2 = xRoot.ele('Panel');
      xPanel_sub2.ele('PanelId','TimeMeetingPanel');
      xPanel_sub2.ele('Type','Statusbar');
      xPanel_sub2.ele('Icon','Concierge');
      xPanel_sub2.ele('Order','2');
      xPanel_sub2.ele('Color','#FF7033');
      xPanel_sub2.ele('Name',"회의예약");

      let xPage_sub2 = xPanel_sub2.ele('Page');
      xPage_sub2.ele('Name',"회의예약");

      let xPanel_sub3 = xRoot.ele('Panel');
      xPanel_sub3.ele('PanelId','ContactPanel');
      xPanel_sub3.ele('Type','Statusbar');
      xPanel_sub3.ele('Icon','Lightbulb');
      xPanel_sub3.ele('Order','4');
      xPanel_sub3.ele('Color','#07C1E4');
      xPanel_sub3.ele('Name',"주소록");

      let xPage_sub3 = xPanel_sub3.ele('Page');
      xPage_sub3.ele('Name','주소록');

      let xPanel = xRoot.ele('Panel');
      xPanel.ele('PanelId','FastMeetingPanel');
      xPanel.ele('Type','Statusbar');
      xPanel.ele('Icon','Lightbulb');
      xPanel.ele('Order','3');
      xPanel.ele('Color','#FF3D67');
      xPanel.ele('Name',"즉시예약");

      let xPage_main = xPanel.ele('Page');
      xPage_main.ele('Name','즉시예약');
      xPage_main.ele('PageId','FRMain');
      xPage_main.ele('Options');

      let xPage_Row1 = xPage_main.ele('Row');
      xPage_Row1.ele('Name','Message');

      let xPage_Row2 = xPage_main.ele('Row');
      xPage_Row2.ele('Name','회의 시간');

      let xPage_Row3 = xPage_main.ele('Row');
      xPage_Row3.ele('Name','시간 설정');

      let xPage_Row4 = xPage_main.ele('Row');
      xPage_Row4.ele('Name','빈 회의실 확인');

      let xPage_Row1_Widget = xPage_Row1.ele('Widget');
      xPage_Row1_Widget.ele('WidgetId','SystemMessage');
      xPage_Row1_Widget.ele('Name','회의 시간을 설정해 주세요');
      xPage_Row1_Widget.ele('Type','Text');
      xPage_Row1_Widget.ele('Options','size=4;fontSize=small;align=center');

      let xPage_Row2_Widget = xPage_Row2.ele('Widget');
      xPage_Row2_Widget.ele('WidgetId','TimeMessage');
      xPage_Row2_Widget.ele('Name',curDate);
      xPage_Row2_Widget.ele('Type','Text');
      xPage_Row2_Widget.ele('Options','size=4;fontSize=small;align=center');

      let xPage_Row3_Widget1 = xPage_Row3.ele('Widget');
      xPage_Row3_Widget1.ele('WidgetId','Time_One');
      xPage_Row3_Widget1.ele('Name','1시간');
      xPage_Row3_Widget1.ele('Type','Button');
      xPage_Row3_Widget1.ele('Options','size=2');

      let xPage_Row3_Widget2 = xPage_Row3.ele('Widget');
      xPage_Row3_Widget2.ele('WidgetId','Time_Two');
      xPage_Row3_Widget2.ele('Name','2시간');
      xPage_Row3_Widget2.ele('Type','Button');
      xPage_Row3_Widget2.ele('Options','size=2');

      let xPage_Row3_Widget3 = xPage_Row3.ele('Widget');
      xPage_Row3_Widget3.ele('WidgetId','Time_Three');
      xPage_Row3_Widget3.ele('Name','3시간');
      xPage_Row3_Widget3.ele('Type','Button');
      xPage_Row3_Widget3.ele('Options','size=2');

      let xPage_Row3_Widget4 = xPage_Row3.ele('Widget');
      xPage_Row3_Widget4.ele('WidgetId','Time_MAX');
      xPage_Row3_Widget4.ele('Name','최대');
      xPage_Row3_Widget4.ele('Type','Button');
      xPage_Row3_Widget4.ele('Options','size=2');

      let xPage_Row4_Widget = xPage_Row4.ele('Widget');
      xPage_Row4_Widget.ele('WidgetId','CheckRoom_2');
      xPage_Row4_Widget.ele('Name','빈 회의실 확인');
      xPage_Row4_Widget.ele('Type','Button');
      xPage_Row4_Widget.ele('Options','size=2');

      return xRoot.end({pretty:true});
  }

  function createContactPanel(){                        // 주소록 미팅 패널 생성
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

  function createNormalPanel(){                         // 일반 미팅 패널 생성

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

    if(-1!=wevent.WidgetId.toString().indexOf("TIME_")){
      //장비 버튼
      epButton(wevent.WidgetId);
    }else if(-1!=wevent.WidgetId.toString().indexOf("CON_")){
      con_ep_button(wevent.WidgetId);
    }else if(-1!=wevent.WidgetId.toString().indexOf("NORMAL_")){
      console.log("TTTT");
      normal_ep_button(wevent.WidgetId);
    }else if(-1!=wevent.WidgetId.toString().indexOf("ML_")){
      reconnect_meeting(wevent.WidgetId);
    }else{
      //일반 버튼
      switch(wevent.WidgetId){
        case "StartMonth_Spinner"   : startMonth_Spinner(wVal);   break;
        case "StartDay_Spinner"     : startDay_Spinner(wVal);     break;
        case "StartHour_Spinner"    : startHour_Spinner(wVal);    break;
        case "StartMinute_Spinner"  : startMinute_Spinner(wVal);  break;
        case "EndHour_Spinner"      : endHour_Spinner(wVal);      break;
        case "EndMinute_Spinner"    : endMinute_Spinner(wVal);    break;
        case "CheckRoom"            : checkRoom();                break;
        case "ClearRoom"            : clearRoom();                break;
        case "ReservationRoom"      : reservationRoom();          break;
        case "CallBtn"              : call_btn_event();           break;
        case "CallBtnNoraml"        : call_btn_event_normal();    break;

      }
    }
  }

  function startMonth_Spinner(val){ //월 조정
    if('increment'==val){
      self.tmStartDate.setMonth(self.tmStartDate.getMonth()+1);
    }else if('decrement'==val){
      self.tmStartDate.setMonth(self.tmStartDate.getMonth()-1);
    }
    updateTime();
  }

  function startDay_Spinner(val){   //일 조정
    if('increment'==val){
      self.tmStartDate.setDate(self.tmStartDate.getDate()+1);
    }else if('decrement'==val){
      self.tmStartDate.setDate(self.tmStartDate.getDate()-1);
    }
    updateTime();
  }

  function startHour_Spinner(val){   //시작시간 조정
    if('increment'==val){
      self.tmStartDate.setHours(self.tmStartDate.getHours()+1);
    }else if('decrement'==val){
      self.tmStartDate.setHours(self.tmStartDate.getHours()-1);
    }
    updateTime();
  }

  function startMinute_Spinner(val){  //종료분 조정
    if('increment'==val){
      self.tmStartDate.setMinutes(self.tmStartDate.getMinutes()+1);
    }else if('decrement'==val){
      self.tmStartDate.setMinutes(self.tmStartDate.getMinutes()-1);
    }
    updateTime();
  }

  function endHour_Spinner(val){      //종료시간 조정
    if('increment'==val){
      self.tmEndDate.setHours(self.tmEndDate.getHours()+1);
    }else if('decrement'==val){
      self.tmEndDate.setHours(self.tmEndDate.getHours()-1);
    }
    updateTime();
  }

  function endMinute_Spinner(val){      //종료분 조정
    if('increment'==val){
      self.tmEndDate.setMinutes(self.tmEndDate.getMinutes()+1);
    }else if('decrement'==val){
      self.tmEndDate.setMinutes(self.tmEndDate.getMinutes()-1);
    }
    updateTime();
  }

  function updateTime(){                // 시간 반영
    let sTime = self.tmStartDate;
    let eTime = self.tmEndDate;
    let curDay = dateFormat(sTime,'yy년 mm월 dd일');
    let curSTime = dateFormat(sTime,'HH:MM');
    let curETime = dateFormat(eTime,'HH:MM');
    let strTime = curDay+' '+curSTime+' ~ '+curETime;

    self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:'TimeMessage' , Value:strTime});
  }

  function checkRoom(){   //타임 미팅 해당 시간 가능한 장비 조회
      self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:'CheckRoom' , Value:'active'});

      // let startTime = self.tmStartDate;
      // let endTime = self.tmEndDate;
      // let data = {};
      // data['startTime'] = startTime;
      // data['endTime'] = endTime;
      // let param = JSON.stringify(data);
      //
      // let res = request('POST', 'http://192.168.0.9:8000/api/v1/getTimeMeetDevice', {
      //   'content-type' : 'application/json',
      //   'charset' : 'UTF-8',
      //   'body' : param
      // });
      //
      // let strBody = res.getBody('utf8');
      // let retBody = JSON.parse(strBody);
      // let retResult = retBody.result;
      // let retItem = retBody.item;
      //
      // for(let i=0;i<retItem.length;i++){
      //   self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:retItem[i]['ep_id'] , Value:'active'});
      //   var temp = {}
      //   temp['ep_id'] = retItem[i]['ep_id'];
      //   temp['status'] = "active";
      //   self.tmEPList.push(temp);
      // }

      //getName 사용하여 SelectedRoomMessage 메시지 변경
      // for(let i=0;i<self.tmEPList.length;i++){
      //
      // }
      // self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:'SelectedRoomMessage' , Value:''});

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

  function clearRoom(){           //타임 미팅 초기화

      //시간 초기화
      let curDate = new Date();
      self.tmStartDate = curDate;
      self.tmEndDate = curDate;
      updateTime();

      //EP 초기화

  }

  function reservationRoom(){     //타임 미팅 예약

      let data = {};
      data['epList'] = self.tmEPList;
      data['startTime'] = self.tmStartDate;
      data['endTime'] = self.tmEndDate;
      let param = JSON.stringify(data);

      let res = request('POST', 'http://127.0.0.1:8000/api/v1/addTimeMeetReserve', {
        'content-type' : 'application/json',
        'charset' : 'UTF-8',
        'body' : data
      });

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
    //param['eplist'] = self.conEPList;
    param['eplist'] = ["EPI00000009"];

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

            self.xapi.command('Dial',{'Number':call_id}).catch ((err) => {
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

            self.xapi.command('Dial',{'Number':call_id}).catch ((err) => {
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

  //---------------------------------------- 재 연결 기능 ----------------------------------------
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

        self.xapi.command('Dial',{'Number':retCallId}).catch ((err) => {
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
    let seqId = feedbackId.substring(7);
    let param = {};
    param['seq'] = seqId;
    jsonstrparam = JSON.stringify(param);

    let res = request('POST', 'http://'+self.tempTMIp+':'+self.tempTMPort+'/api/v1/searchContactMeeting', {
      'content-type' : 'application/json',
      'charset' : 'UTF-8',
      'body' : jsonstrparam
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);

    let retCallId = retBody.call_id;

    self.xapi.command('Dial',{'Number':retCallId}).catch ((err) => {
        console.error("inCallFunction Error : ",err);
    });

  }

}

module.exports = inRoomApi;
