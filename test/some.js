var DbClient = require('mariasql');
var endPointList = [];

var greet = function(pHost,pUser,pPassword,pDb,type){

  //console.log(p1,p2);
  try{
    var c = new DbClient({
        host: pHost,
        user: pUser,
        password: pPassword,
        db:pDb
    });

  }catch (exception){
    //throw new Error(exception.toString());
    //throw new Error('오류 핸들링 테스트');
    console.log(exception.toString());
  }

    if(type==1){
      selectQuery(c);
    }else if(type==2){
      selectQuery2(c);
    }




}

function selectQuery(c){

  try{
    c.query('SELECT * FROM cms_endpoint', function(err, rows) {
      if (err)
          throw err;
      var rowList = rows;
      for(var i=0;i<rowList.length;i++){
          console.log(i," : ",rowList[i]['']);
          //endPointList.push(rowList[i]['ip']);
      }
    });
    c.end();
    //throw new Error('오류 핸들링 테스트1');
  }catch(exception){

    console.log(exception.toString());
  }

}

function selectQuery2(c){

  try{
    c.query('SELECT * FROM cms_endpoint_group', function(err, rows) {
      if (err)
          throw err;
      var rowList = rows;
      for(var i=0;i<rowList.length;i++){
          console.log(i," : ",rowList[i]['ep_group_name']);
          //endPointList.push(rowList[i]['ip']);
      }
    });

    c.end();
    //throw new Error('오류 핸들링 테스트2');
  }catch(exception){

    console.log(exception.toString());
  }

}

module.exports = greet
