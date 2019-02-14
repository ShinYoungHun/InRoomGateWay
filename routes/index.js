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

function initfn(){

  var c = new DbClient({
    host: jsonContent['db']['ip'],
    user: jsonContent['db']['id'],
    password: jsonContent['db']['pwd'],
    db:jsonContent['db']['name']
  });

  c.query("SELECT ip , device_id , IFNULL(device_pwd,'') AS device_pwd , CASE WHEN device_open IS NULL THEN 'N' WHEN device_open = '' THEN 'N' ELSE device_open END AS device_open, CASE WHEN device_officer IS NULL THEN 'N'  WHEN device_officer = '' THEN 'N' ELSE device_officer END AS device_officer FROM cms_endpoint WHERE device_module = 'Y' AND delete_yn = 'N'", function(err, rows,callback) {
      if (err){
        throw err;
      }
      var rowList = rows;
      for(var i=0;i<rowList.length;i++){

          var temp = {};
          temp['ip'] = rowList[i]['ip'];
          temp['id'] = rowList[i]['device_id'];
          temp['password'] = rowList[i]['device_pwd'];
          temp['device_open'] = rowList[i]['device_open'];
          temp['device_officer'] = rowList[i]['device_officer'];
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
  console.log("Restart All");
  res.json(200);
  shelljs.exec('forever restartall');

});



module.exports = router;
