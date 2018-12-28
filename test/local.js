const util = require('util');
const EventEmitter = require('events').EventEmitter;
const jsxapi = require("jsxapi");
const request = require('sync-request');
const dateFormat = require('dateformat');
const utf8 = require('utf8');
const encoding = require("encoding");
var unicodeToJsEscape = require('unicode-escape');
var builder = require('xmlbuilder');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

function createInformationPanel(){
  let epip = "127.0.0.1";

  let res = request('GET', 'http://192.168.0.102:8000/api/v1/checkReservation'+'?epip='+epip, {
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
  xPanel.ele('panelId','InformationPanel');
  xPanel.ele('Type','Statusbar');
  xPanel.ele('Icon','Info');
  xPanel.ele('Order','1');
  xPanel.ele('Color','#D541D8');
  xPanel.ele('Name',"예약확인");

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

  // let xWidget = xRow.ele('Widget');
  // xWidget.ele('WidgetId','SystemMessage');
  // xWidget.ele('Name','Text');
  // xWidget.ele('Type','Text');
  // xWidget.ele('Options','size=4;fontSize=small;align=center');

  console.log(xRoot.end({pretty:true}));
  return xRoot.end({pretty:true});

}

function initTimeMeetingPanel(){//TimeMeetingPanel 초기화

  console.log(new Date());
  let epip = "127.0.0.1";

  let res = request('GET', 'http://192.168.0.102:8000/api/v1/getDeviceInfo', {
    'content-type' : 'application/json',
    'charset' : 'UTF-8'
  });

  let strBody = res.getBody('utf8');
  let retBody = JSON.parse(strBody);
  let retResult = retBody.result;
  let retItem = retBody.item;

  let xRoot = builder.create('Extensions');
  xRoot.ele('Version', '1.5');

  let xPanel = xRoot.ele('Panel');
  xPanel.ele('panelId','TimeMeetingPanel');
  xPanel.ele('Type','Statusbar');
  xPanel.ele('Icon','Concierge');
  xPanel.ele('Order','2');
  xPanel.ele('Color','#FF7033');
  xPanel.ele('Name',"회의 예약");

  let xPage_main = xPanel.ele('Page');
  xPage_main.ele('Name','Message');

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
  xRow_widget_2.ele('Name','MM 월 DD 일 HH 시 MM 분 ~ HH시 MM 분');
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
  xRow_widget_3_1.ele('WidgetId','StartHour_Spinner');
  xRow_widget_3_1.ele('Type','Spinner');
  xRow_widget_3_1.ele('Options','size=2;style=vertical');

  let xRow_widget_4_2 = xRow_main_4.ele('Widget');
  xRow_widget_3_2.ele('WidgetId','StartMinute_Spinner');
  xRow_widget_3_2.ele('Type','Spinner');
  xRow_widget_3_2.ele('Options','size=2;style=vertical');

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
    let tempEp = retItem[i].endpoint;

    for(let j=0;j<tempEp.length;j++){

      let ep_id = tempEp[j].ep_id;
      let ep_name = tempEp[j].ep_name;
      let xRow_ep = xRow_ep_group.ele('Widget');

      xRow_ep.ele('Widgetid',ep_id);
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
  xPage_confirm_row2_Widget.ele('Type','Button');
  xPage_confirm_row2_Widget.ele('Options','size=2');

  let xPage_confirm_row2_Widget1 = xPage_confirm_row3.ele('Widget');
  xPage_confirm_row2_Widget1.ele('WidgetId','ClearRoom');
  xPage_confirm_row2_Widget1.ele('Name','초기화');
  xPage_confirm_row2_Widget1.ele('Type','Text');
  xPage_confirm_row2_Widget1.ele('Options','size=4;fontSize=small;align=center');

  let xPage_confirm_row2_Widget2 = xPage_confirm_row3.ele('Widget');
  xPage_confirm_row2_Widget2.ele('WidgetId','ReservationRoom');
  xPage_confirm_row2_Widget2.ele('Name','예약');
  xPage_confirm_row2_Widget2.ele('Type','Button');
  xPage_confirm_row2_Widget2.ele('Options','size=2');

  console.log(xRoot.end({pretty:true}));
  console.log(new Date());
}

function initFastMeetingPanel(){//FastMeetingPanel 초기화

  console.log(new Date());
  // let epip = "127.0.0.1";

  // let res = request('GET', 'http://192.168.0.102:8000/api/v1/getFastInfo', {
  //   'content-type' : 'application/json',
  //   'charset' : 'UTF-8'
  // });
  //
  // let strBody = res.getBody('utf8');
  // let retBody = JSON.parse(strBody);
  // let retResult = retBody.result;
  // let retItem = retBody.item;

  let curDate = new Date();
  curDate = dateFormat(curDate,'yy년 mm월 dd일 HH:MM');

  let xRoot = builder.create('Extensions');
  xRoot.ele('Version', '1.5');

  let xPanel = xRoot.ele('Panel');
  xPanel.ele('panelId','FastMeetingPanel');
  xPanel.ele('Type','Statusbar');
  xPanel.ele('Icon','Lightbulb');
  xPanel.ele('Order','3');
  xPanel.ele('Color','#FF7033');
  xPanel.ele('Name',"즉시 예약");

  let xPage_main = xPanel.ele('Page');
  xPage_main.ele('Name','즉시 예약');
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

  console.log(xRoot.end({pretty:true}));
  console.log(new Date());

}

function checkRoom(){   //타임 미팅 해당 시간 가능한 장비 조회

    let startTime = '2018-11-05 16:30';
    let endTime = '2018-11-05 17:30';
    let data = {};
    data['startTime'] = startTime;
    data['endTime'] = endTime;
    let param = JSON.stringify(data);
    let tmEPList = []

    let res = request('POST', 'http://192.168.0.102:8000/api/v1/getTimeMeetDevice', {
      'content-type' : 'application/json',
      'charset' : 'UTF-8',
      'body' : param
    });

    let strBody = res.getBody('utf8');
    let retBody = JSON.parse(strBody);
    let retResult = retBody.result;
    let retItem = retBody.item;

    for(let i=0;i<retItem.length;i++){
      console.log(retItem[i]['ep_id']);
      //self.xapi.command('Userinterface Extensions Widget Setvalue',{WidgetId:retItem[i]['ep_id'] , Value:'active'})
      var temp = {}
      temp['ep_id'] = retItem[i]['ep_id'];
      temp['status'] = "active";
      tmEPList.push(temp);
    }

    console.log(tmEPList);

}

checkRoom();

function eachRecursive(obj)
{
    for (var k in obj)
    {
        //console.log("K >>>>> : ",k);
        if (typeof obj[k] == "object" && obj[k] !== null){
          eachRecursive(obj[k]);
        }else{
            console.log( k , obj[k]);
        }

    }
}
