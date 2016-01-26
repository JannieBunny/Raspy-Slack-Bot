//Import
var SlackAPI = require('slackbotapi');
var fs = require('fs');
var https = require('https');
var http = require('https');
var _ = require('lodash');

//Setup
console.log('Init Slack API');
var slack = new SlackAPI({
    'token': 'Slack API Token',
    'logging': true,
    'autoReconnect': true
});

var config;

//Read Conf
fs.readFile('conf/config.json', 'utf8', function(error, data){
	if(error){
		console.log(error);
		return;	
	}
	console.log('Reading Config');
	config = JSON.parse(data);
	console.log(config);	
});

slack.on('message', function (data) {
    if (typeof data.text == 'undefined') 
		return;
	
	var links = _.filter(config, function(item){
		return item.type === "links";
	});
	console.log(links);
	_.forEach(links, function(item){
		if(slack.getChannel(data.channel).name === item.channel){
			processLinks(data.text, item.keywords, item.regex_url, item.regex_name, item.download_dir);
		}
	});
});

function processLinks(text, keywords, regexURL, regexName, downloadDir) {
	var linksToProcess = text.split('\n');
	_.forEach(linksToProcess, function(link){
		console.log('Message Link: ' + link);
		var file_name = new RegExp(regexName).exec(text);
		if(file_name && file_name.length > 0){
			var filename = file_name[1];
			console.log('File Name: ' + filename);
			_.forEach(keywords, function(keyword){
				console.log('Checking Keyword: ' + keyword.name);
				if(filename.toLowerCase().indexOf(keyword.name.toLowerCase()) > 1){
					console.log('Yay we found something');
					var file = fs.createWriteStream(filename);
					if(keyword.isTVContent){
						var season_episode = new RegExp("([sS][0-9]{2}[eE][0-9]{2})").exec(filename);
						if(season_episode && season_episode.length > 0){
							var seriesPosition = season_episode[1];
							console.log('Episode Number: ' + seriesPosition);
							file = fs.createWriteStream(filename + ' ' + seriesPosition);
							fs.readdir(downloadDir , function(error, files){
								var duplicates = _.filter(files, function(item){
									return item.indexOf(seriesPosition) > 0 && item.indexOf(filename.toLowerCase()) > 0; 
								});
								if(typeof duplicates !== 'undefined' && duplicates.length > 0){
									//Duplicate Skip
									console.log('Duplcate Detected, ignoring');
								}
								else{
									console.log('File Name: ' + file);
									downloadFile(text, regexURL, file);
								}
							});
						}
					}
					else{
						console.log('File Name: ' + file);
						downloadFile(text, regexURL, file);
					}
				}
			});
		}		
	});
};

function downloadFile(text, regexURL, file) {
	var url = new RegExp(regexURL).exec(text);
	if(url && url.length > 0){
		var urlDownload = url[1];
		if (urlDownload.indexOf("http://") < 1){
			http.get(urlDownload, function(response) {
				response.pipe(file);
			});
		}
		else{
			https.get(urlDownload, function(response) {
				response.pipe(file);
			});
		}
	}	
}