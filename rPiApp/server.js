var mainServerListenPort = process.argv[2];
var serialPortPath = process.argv[3];

var useCaptivePortal = true;
var captivePortalAddress = 'laptracker.wifi';

console.log('Listening at: ' + mainServerListenPort);

var connect = require('connect');
var serveStatic = require('serve-static');

var connected = connect();

connected.use(function captivePortal(req, res, next) {
  if (req.headers.host != captivePortalAddress) {
  	res.writeHead(302, {
  	'Location': 'http://' + captivePortalAddress + '/'
	});
	res.end();
  }
  else {
  	next();
  }
});

connected.use(serveStatic('www/')).listen(mainServerListenPort);


var http = require('http');
var WebSocketServer = require('websocket').server;

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8081, function() {
    console.log((new Date()) + ' Server is listening on port 8081');
});

var wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});


var trackingRacers = ['CC'];
var minLapTime = 5000; // 5000 ms

function LapTracker(checkpointCrossCallback) {
	var lapsPerRacer = { };

	this.reset = function() {
		for (var i = 0; i < trackingRacers.length; i++)
		{
			lapsPerRacer[trackingRacers[i]] = [];	
		}
	}

	this.getCurrentState = function(){
		return lapsPerRacer;
	}

	this.recordCheckpointEvent = function(racerId) {
		if (trackingRacers.indexOf(racerId) < 0)
			return;

		var lapsForThisRacer = lapsPerRacer[racerId];
		var crossTime = process.hrtime();

		var corssTimeMs = (1e9 * crossTime[0] + crossTime[1]) / 1e6; // convert to ms 

		if (lapsForThisRacer.length > 0 && (corssTimeMs - lapsForThisRacer[lapsForThisRacer.length - 1]) < minLapTime) {
			return;
		}

		lapsForThisRacer.push(corssTimeMs);

		if (checkpointCrossCallback)
		{
			checkpointCrossCallback(racerId, corssTimeMs);
		}
	}

	this.reset();
}

var aliveConnections = [];


function broadcastCheckpointCrossEvent(racerId, time) {
	var event = { 'racerId': racerId, 'time': time };

	var message = {'msgId': 'checkpoint',  data:event};
	broadcastMessage(JSON.stringify(message));
}

function broadcastMessage(message){
	for (var i = 0; i < aliveConnections.length; i++) {
		var connection = aliveConnections[i];

		connection.sendUTF(message);
	}
}

function createRacingTableMessage() {
	return JSON.stringify({'msgId': 'racingTable', data: tracker.getCurrentState()});
}


var tracker = new LapTracker(broadcastCheckpointCrossEvent);


wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted.');

    aliveConnections.push(connection);
    connection.sendUTF(createRacingTableMessage());

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            
            if (message.utf8Data == 'reset')
            {
            	console.log('Resetting stats');
            	tracker.reset();

            	broadcastMessage(createRacingTableMessage());
            }
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');

        var connectionIdx = aliveConnections.indexOf(connection);
		aliveConnections.splice(connectionIdx, 1);
    });
});


var serialLib = require("serialport");
var SerialPort = serialLib.SerialPort;

var serialSettings = {
	baudrate: 9600,
	parser: serialLib.parsers.readline("\n")
};
var serialPort = new SerialPort(serialPortPath, serialSettings, false);

var openSerial = function(path){
	serialPort.open(function(error) {
		if (!error) {
			console.log('serial opened');

			serialPort.on("data", function (line) {
			  console.log(line);
			  tracker.recordCheckpointEvent(line.replace(/^\s+|\s+$/g, ''));
			});
		}
		else {
			console.log('serial open failed, retrying', error);
			setTimeout(openSerial, 1000);
		}
	});
}

openSerial();


var readline = require('readline');
var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('guess> ');
rl.prompt();
rl.on('line', function(line) {
    //console.log(line);
    tracker.recordCheckpointEvent(line);
    rl.prompt();
});


