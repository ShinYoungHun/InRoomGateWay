var express = require('express');
var router = express.Router();
var async = require('async');
var DbClient = require('mariasql');                   //MariaDB Connection
var jsxapi = require('jsxapi');                     //ciscoLib
var fs = require('fs');                             //파일시스템
var path = require('path');                         //path 관련?
var Client = require('ssh2').Client;

var greetFunction = require(__basedir+'/test/some.js')
var inRoom = require(__basedir+'/custom_module/InRoomModule.js')
var contents = fs.readFileSync(__basedir+"/source/endPointList.json");
var jsonContent = JSON.parse(contents);
var epList = jsonContent["endPointList"];
var async = require('async');
var shelljs = require('shelljs')

function initfn(){

  var c = new DbClient({
    host: '182.237.86.248',
    user: 'cmsuser',
    password: 'cmsuser',
    db:'kotech_cisco_cms'
  });

  c.query("SELECT ip, device_id, IFNULL(device_pwd,'') AS device_pwd FROM cms_endpoint WHERE device_module = 'Y' AND delete_yn = 'N'", function(err, rows,callback) {
      if (err){
        throw err;
      }
      var rowList = rows;
      for(var i=0;i<rowList.length;i++){

          var temp = {};
          temp['ip'] = rowList[i]['ip'];
          temp['id'] = rowList[i]['device_id'];
          temp['password'] = rowList[i]['device_pwd'];
          epList.push(temp);
      }
      console.log(epList);
      callFN();

  });

  c.end();
}

function callInRoom(ep){
  new inRoom(ep);
}

function callFN(){
  console.log("Start Con");
  async.each(epList,callInRoom,function(err,result){
    console.log('parallel Done');
  });
}

initfn();

router.post('/inRoomCalls',function(req,res,next){
  res.statuscode = 200
  res.json(200,{"result":"success"})
});

router.get('/', function(req, res, next) {
   res.render('index.html', { title: 'Express' });
});

router.post('/restart',function(req,res,next){
  console.log("TTTTTTTTT");
  res.json(200);
  shelljs.exec('node www');

});



module.exports = router;
