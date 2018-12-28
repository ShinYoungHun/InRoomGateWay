var fs = require('fs');

var greetFunction = require('./some.js')
var inRoom = require('../custom_module/InRoomModule.js')
var contents = fs.readFileSync("../source/endPointList.json");
var jsonContent = JSON.parse(contents);
var epList = jsonContent["endPointList"];
var async = require('async');

// for(var i=0;i<epList.length;i++){
//     var retVal = new inRoom(epList[i])
// }

// var epListCon = []
// for(var i=0;i<epList.length;i++){
//   epListCon[i] = function(callback){
//     var temp = epList[i];
//     new inRoom(temp);
//     callback(null,"one");
//   }
// }
//
// async.parallel([
//   function test1(callback){
//     new inRoom(epList[0]);
//     callback(null,"one");
//   },function test2(callback){
//     new inRoom(epList[1]);
//     callback(null,"two");
//   }
// ],function(err,result){
//   console.log("result");
// });


function callInRoom(ep){
  new inRoom(ep)
}

async.each(epList,callInRoom,function(err,result){
  console.log('parallel Done');
});
