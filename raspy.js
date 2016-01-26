var slackAPI = require('slackbotapi');
var fs = require('fs');
var https = require('https');

var slack = new slackAPI({
    'token': 'Token from Slack',
    'logging': true,
    'autoReconnect': true
});

slack.on('message', function (data) {
    if (typeof data.text == 'undefined') 
		return;
	
	if(slack.getChannel(data.channel).name !== "general"){
		fs.appendFile('message.txt', data.text + '\n', function (err) {

		});	
	}
});

(function(){
    setTimeout(function(){
		fs.readFile('regexpattern.txt', function read(err, regex) {
			if (err)
				throw err;
			processRSS(new RegExp(regex.toString()));
		});
	}, 5000);
})();

var processRSS = function(regex){
	console.log(regex);
	var lineReader = require('readline').createInterface({
	  input: require('fs').createReadStream('message.txt')
	});
	lineReader.on('line', function (line) {
		var url = regex.exec(line);
		if(url && url.length > 0){
			var urlDownload = url[1];	
			var file = fs.createWriteStream(generateUUID() + '.torrent');
			var request = https.get(urlDownload, function(response) {
			  response.pipe(file);
			});
		}
	});
};

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};