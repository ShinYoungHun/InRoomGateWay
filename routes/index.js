var express = require('express');
var router = express.Router();
var async = require('async');
var DbClient = require('mariasql');                   //MariaDB Connection
var jsxapi = require('jsxapi');                     //ciscoLib
var fs = require('fs');                             //파일시스템
var path = require('path');                         //path 관련?
var Client = require('ssh2').Client;

var greetFunction = require(__basedir+'/test/some.js');
var inRoom = require(__basedir+'/custom_module/InRoomModule.js');
var contents = fs.readFileSync(__basedir+"/source/endPointList.json");
var jsonContent = JSON.parse(contents);
//var epList = jsonContent["endPointList"];
var epList = []
var async = require('async');
var shelljs = require('shelljs');

// function initfn(){
//
//   var c = new DbClient({
//     host: jsonContent['db']['ip'],
//     user: jsonContent['db']['id'],
//     password: jsonContent['db']['pwd'],
//     db:jsonContent['db']['name']
//   });
//
//   c.query("SELECT ip , device_id , IFNULL(device_pwd,'') AS device_pwd , CASE WHEN device_open IS NULL THEN 'N' WHEN device_open = '' THEN 'N' ELSE device_open END AS device_open, CASE WHEN device_officer IS NULL THEN 'N'  WHEN device_officer = '' THEN 'N' ELSE device_officer END AS device_officer FROM cms_endpoint WHERE device_module = 'Y' AND delete_yn = 'N'", function(err, rows,callback) {
//       if (err){
//         throw err;
//       }
//       var rowList = rows;
//       for(var i=0;i<rowList.length;i++){
//
//           var temp = {};
//           temp['ip'] = rowList[i]['ip'];
//           temp['id'] = rowList[i]['device_id'];
//           temp['password'] = rowList[i]['device_pwd'];
//           temp['device_open'] = rowList[i]['device_open'];
//           temp['device_officer'] = rowList[i]['device_officer'];
//           epList.push(temp);
//       }
//       console.log(epList);
//       callFN();
//
//   });
//
//   c.end();
// }
//
// function callInRoom(ep){
//   new inRoom(ep);
// }
//
// function callFN(){
//   console.log("Start Con");
//   async.each(epList,callInRoom,function(err,result){
//     console.log('parallel Done');
//   });
// }
//
// initfn();

router.post('/inRoomCalls',function(req,res,next){
  res.statuscode = 200
  res.json(200,{"result":"success"})
});

router.get('/', function(req, res, next) {
   res.render('index.html', { title: 'Express' });
});

router.post('/restart',function(req,res,next){
  console.log("Restart All");
  res.json(200);
  shelljs.exec('forever restartall');

});

router.post('/create', function(req,res,next){
  var tt = JSON.parse(req.body['ep_list']);
  var data64 = req.body['data'];

  for(var i=0;i<tt.length;i++){
    var temp = tt[i];
    var t_ip = temp['ep_ip'];
    var t_id = temp['ep_id'];
    var t_pw = temp['ep_pwd'];
    ConnectCodec(t_ip,t_id,t_pw,data64);
  }

  let result = {
    'test':'test'
  }

  res.json(result);
});

router.post('/updatestatus',function(req,res,next){
  var tt = JSON.parse(req.body['ep_list']);
  var tt2 = req.body['name'];
  var tt3 = req.body['MaxReceiveCallRate'];
  var tt4 = req.body['AutoAnswerMode'];

  for(var i=0;i<tt.length;i++){
    var temp = tt[i];
    var t_ip = temp['ep_ip'];
    var t_id = temp['ep_id'];
    var t_pw = temp['ep_pwd'];
  }

  var tempxapi = jsxapi.connect("ssh://" + t_ip,{
     username: t_id,
     password: t_pw,
  });

  tempxapi.on('error', (err) => {
    console.error(ip ,`connection failed: ${err}, exiting`);
    process.exit(1);
  });

  statusUpdate(tempxapi,tt2).then(function(ret){
    statusUpdate2(tempxapi,tt3).then(function(ret2){
      statusUpdate3(tempxapi,tt4).then(function(ret3){
        retval = {};
        retval['status'] = 200;
        res.json(retval);
      },function(){})
    },function(){})
  },function(){});

});

function statusUpdate(tempxapi,tt2){
  return new Promise(function (resolve, reject) {
    tempxapi.config.set('SystemUnit Name', tt2);
  });
}

function statusUpdate2(tempxapi,tt3){
  return new Promise(function (resolve, reject) {
    tempxapi.config.set('conference MaxReceiveCallRate', tt3);
  });
}

function statusUpdate3(tempxapi,tt4){
  return new Promise(function (resolve, reject) {
    tempxapi.config.set('Conference AutoAnswer mode', tt4);
  });
}

router.post('/checkstatus',function(req,res,next){
  var tt = JSON.parse(req.body['ep_list']);

  for(var i=0;i<tt.length;i++){
    var temp = tt[i];
    var t_ip = temp['ep_ip'];
    var t_id = temp['ep_id'];
    var t_pw = temp['ep_pwd'];

  }

  var tempxapi = jsxapi.connect("ssh://" + t_ip,{
     username: t_id,
     password: t_pw,
  });

  tempxapi.on('error', (err) => {
    console.error(ip ,`connection failed: ${err}, exiting`);
    process.exit(1);
  });

  statusSearch(tempxapi).then(function(ret){
    statusSearch2(tempxapi).then(function(ret2){
      statusSearch3(tempxapi).then(function(ret3){
        console.log(ret,ret2,ret3)
        retval = {};
        retval['name'] = ret;
        retval['MaxReceiveCallRate'] = ret2;
        retval['AutoAnswerMode'] = ret3;
        res.json(retval);
      },function(){})
    },function(){})
  },function(){});

});

function statusSearch(tempxapi){
  return new Promise(function (resolve, reject) {
    tempxapi.config.get('SystemUnit Name', {
    }).then((ret) => {
      resolve(ret);
    });
  });
}

function statusSearch2(tempxapi){
  return new Promise(function (resolve, reject) {
    tempxapi.config.get('conference MaxReceiveCallRate', {
    }).then((ret) => {
      resolve(ret);
    });
  });
}

function statusSearch3(tempxapi){
  return new Promise(function (resolve, reject) {
    tempxapi.config.get('Conference AutoAnswer mode', {
    }).then((ret) => {
      resolve(ret);
    });
  });
}

router.post('/phone',function(req,res,next){
  var tt = JSON.parse(req.body['ep_list']);
  var ttt = JSON.parse(req.body['ep_group_list']);
  var tttt = JSON.parse(req.body['ep']);

  for(var i=0;i<tt.length;i++){
    var temp = tt[i];
    var t_ip = temp['ep_ip'];
    var t_id = temp['ep_id'];
    var t_pw = temp['ep_pwd'];
    phoneBookSearch(t_ip, t_id, t_pw, ttt ,tttt);
  }

});



function phoneBookSearch(ip, admin, pw, ttt, tttt){

    console.log(ip,admin,pw);

    var tempxapi = jsxapi.connect("ssh://" + ip,{
       username: admin,
       password: pw,
    });

    var folder_list = []
    var contact_list = []

    tempxapi.on('error', (err) => {
      console.error(ip ,`connection failed: ${err}, exiting`);
      process.exit(1);
    });

    tempxapi.command('Phonebook Search', {
      limit : 65534
    }).then((ret) => {

      folder_list = ret['Folder'];
      contact_list = ret['Contact'];

      if(typeof(folder_list)!="undefined"){
        if(folder_list.length>0){
          for(var i=0;i<folder_list.length;i++){

            tempxapi.command('Phonebook Folder Delete',{
              FolderId: folder_list[i]['FolderId']
            }).then((ret) => {
              console.log("Phonebook Folder Delete",ret);
            }).catch((err) => {

            });
          }
        }
      }

      if(typeof(contact_list)!="undefined"){
        if(contact_list.length>0){
          for(var i=0;i<contact_list.length;i++){
            tempxapi.command('Phonebook Contact Delete',{
              ContactId: contact_list[i]['ContactId']
            }).then((ret) => {
              console.log("Phonebook Contact Delete",ret);
            }).catch((err) => {

            });
          }
        }
      }


      setTimeout(() => {
        console.log("TTTTTTT");
        phone_folder_add(tempxapi,ttt,tttt);
      }, 3000);


    }).catch((err) => {
      console.log(ip, `error: ${err.message}`);
    }).then(function(){

    });

}

function phone_folder_add(tempxapi,ttt,tttt){

  for(var i=0;i<ttt.length;i++){
    var tempName = "";
    var tempdict = ttt[i];
    var templist = [];


    tempxapi.command('Phonebook Folder Add ',{
      Name: ttt[i]['ep_group_name']
    }).then((ret) => {
      tempName = ret.Name;
      ttt[i]["FolderId"] = tempName;
      console.log("Phonebook Folder ADD",ret);
    }).catch((err) => {
      console.log("Phonebook Folder ERROR",err);
    });


  }

  setTimeout(() => {
    console.log("TTTTTTT");
    phone_contact_add(tempxapi,templist,tttt);
  }, 3000);

}

function phone_contact_add(tempxapi, ttt, tttt){
//  console.log("@@@@@@@@@@@@",tttt);
  console.log("@@@@@@@@@@@@@@@@@@@@@@@@@",ttt);

  for(var i=0;i<tttt.length;i++){
    for(var j=0;j<ttt.length;j++){
      console.log( tttt[i]['ep_group_seq'] , ttt[j]['ep_group_seq'] , tttt[i]['ep_group_seq'] == ttt[j]['ep_group_seq'])
      if(tttt[i]['ep_group_seq'] == ttt[j]['ep_group_seq']){
        console.log(">>>>>>>",tttt[i]);
        tttt[i]['FolderId'] = ttt[j]['FolderId'];
        break;
      }
    }
  }



  for(var i=0;i<tttt.length;i++){
    console.log("!!!!!!!!!!!!!");
    tempxapi.command('Phonebook Contact Add',{
      Name: tttt[i]['ep_name'],
      protocol : "SIP",
      Device: "Video",
      FolderId: tttt[i]['FolderId']
    }).then((ret) => {
      console.log("Phonebook Contact ADD",ret);
    }).catch((err) => {
      console.log("Phonebook Contact ERROR",err);
    });
  }

}

function ConnectCodec(ip,admin,pw,base64decode){

  var tempxapi = jsxapi.connect("ssh://" + ip,{
     username: admin,
     password: pw,
  });

  tempxapi.on('error', (err) => {
    console.error(ip ,`connection failed: ${err}, exiting`);
    process.exit(1);
 });

  tempxapi.command('UserInterface Branding Upload', {
    // Type: 'Branding',
    Type: 'Background',
    body: base64decode
  }).then(() => {
     console.log(ip ,'updated Branding logo in Halfwake mode');

     tempxapi.command('UserInterface Branding Updated',{
       //Type:'Branding'
       Type:'Background'
     }).then(() => {
       console.log(ip ,'UserInterface Branding Updated');
     });

  }).catch((err) => {
     console.error(ip, `could not update Brand logo: ${err.message}`);
     tempxapi.close();
  });
}

module.exports = router;
