const jsxapi = require("jsxapi");


const xapi = jsxapi.connect("ssh://192.168.0.3", {
    username: 'admin',
    password: ''
});

xapi.on('error', (err) => {
    console.error(`connection failed: ${err}, exiting`);
    process.exit(1);
});

xapi.feedback.on('Status', data =>{
  console.log("STATUS : ",data);
});

xapi.feedback.on('Event',data => {
  console.log("EVENT : ",data);
});

xapi.command('CallHistory Get').then(function (data) {

  var temp = data.Entry[0].CallHistoryId
  xapi.command('CallHistory DeleteEntry',{'CallHistoryId':temp}).then(function(data2){
    console.log(data2);
  });
});
