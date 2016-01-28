//Import
var SlackAPI = require('slackbotapi');
var fs = require('fs');
var https = require('https');
var http = require('https');
var _ = require('lodash');

console.log('Working Directory: ' + __dirname);

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
    var globals = _.filter(config, function(item){
       return item.global_keywords && item.global_keywords.length > 0;
    });
	_.forEach(links, function(item){
		if(slack.getChannel(data.channel).name === item.channel){
			processLinks(data.text, item.keywords, item.regex_url, item.regex_name, item.download_dir, item.group_matches_url, globals, item.regex_name_group);
		}
	});
});

function processLinks(text, keywords, regexURL, regexName, downloadDir, group_matches_url, globals, regex_name_group) {
	var linksToProcess = text.split('\n');
	_.forEach(linksToProcess, function(link){
		console.log('Message Link: ' + link);
        var file_name = new RegExp(regexName).exec(link);
        if(file_name){
            if(group_matches_url && file_name.length >= group_matches_url.length){
                var count = 0;
                var a = 0;
                for(a = 0; a < group_matches_url.length; a++){
                    if(group_matches_url[a] !== "*ignore*" && file_name[a].indexOf(group_matches_url[a]) > 0){
                        count++;
                    }
                }
                if(count === group_matches_url.length)
                    processFile(file_name, keywords, downloadDir, text, regexURL, globals, regex_name_group);
                else
                    console.log('File does not match the regex expression in config, ignoring the link');
            }
            else{  
                processFile(file_name, keywords, downloadDir, text, regexURL, globals, regex_name_group);
            }	   
        }
        else
            console.log('Unable to parse message');
	});
};

function downloadFile(text, regexURL, file) {
	var url = new RegExp(regexURL).exec(text);
	if(url && url.length > 0){
		var urlDownload = url[1];
		if (urlDownload.indexOf("http://") > 0){
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

function processFile(file_name, keywords, downloadDir, text, regexURL, globals, regex_name_group){
    if(file_name && file_name.length > 0){
        var filename = file_name[regex_name_group || 1];
        console.log('File Name: ' + filename);
        var completeKeywords = keywords.concat(globals[0].global_keywords || []);
        _.forEach(completeKeywords, function(keyword){
            if(completeKeywords.indexOf('ignore_global') >= 0){
                var file = fs.createWriteStream(__dirname + '\\' + downloadDir + '\\' + filename);
                downloadFile(text, regexURL, file);
            }
            else{
                console.log('Checking Keyword: ' + keyword.name);
                if(filename.toLowerCase().indexOf(keyword.name.toLowerCase()) > 0 || 
                    filename.toLowerCase().indexOf(keyword.name.toLowerCase().split(/[ ,]+/).join('.')) > 0){
                    console.log('Yay we found something');
                    if(keyword.isTVContent){
                        var season_episode = new RegExp("([sS][0-9]{2}[eE][0-9]{2})").exec(filename);
                        if(season_episode && season_episode.length > 0){
                            var seriesPosition = season_episode[1].toUpperCase();
                            console.log('Episode Number: ' + seriesPosition);
                            fs.readdir(__dirname + '\\' + downloadDir , function(error, files){
                                var duplicates = _.filter(files, function(item){
                                    return item.toUpperCase().indexOf(seriesPosition) > 0; 
                                });
                                if(typeof duplicates !== 'undefined' && duplicates.length > 0){
                                    //Duplicate Skip
                                    console.log('Duplcate Detected, ignoring');
                                }
                                else{
                                    file = fs.createWriteStream(__dirname + '\\' + downloadDir + '\\' + filename + ' Detected SE-' + seriesPosition);
                                    downloadFile(text, regexURL, file);
                                }
                            });
                        }
                    }
                    else{
                        var file = fs.createWriteStream(__dirname + '\\' + downloadDir + '\\' + filename);
                        downloadFile(text, regexURL, file);
                    }
                }
                else{
                    console.log('Failed to match message with keyword');
                }
            }
        });
    }	 
}