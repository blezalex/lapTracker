'use strict';

function notifyAudio(lapTime)
{
	var basePath = '/sounds/system/';

	var wholePart = Math.floor(lapTime);

	var audio = document.getElementsByTagName("audio")[0];
//	var audio = new Audio(basePath + ('0000' + wholePart).slice(-4) + '.wav');

	audio.onloadeddata = function() {
		audio.play();	
	};

	audio.src = basePath + ('0000' + wholePart).slice(-4) + '.wav';

	audio.onended = function(){
		audio.onended = null;
	 	audio.src = basePath + '0' + (160 + Math.round((lapTime - wholePart)* 10)) + '.wav';
	 	audio.play();
	};
}

angular.module('lapTracker',  ['chart.js'])
  .controller('MainController', function($scope) {
  	
  	var dataChannelAddr = 'ws://' + window.location.hostname + ':8081';
  	var dataChannel = new WebSocket(dataChannelAddr);
  	var rawLapTimes = [];

  	$scope.lapTimes = [];
  	$scope.bestLapTime = Infinity;
  	$scope.labels = [];

  	$scope.updateLapTimes = function() {
  		// TODO: make incremental update rather than full re-calc

  		$scope.lapTimes = [];
  		$scope.labels = [];
  		$scope.bestLapTime = Infinity;

  		for (var i = 1; i < rawLapTimes.length; i++)
  		{
  			var lapTime = (rawLapTimes[i] - rawLapTimes[i - 1]) / 1000;
			if (lapTime < $scope.bestLapTime)
				$scope.bestLapTime = lapTime;

			$scope.lapTimes.push(lapTime);
			$scope.labels.push('Lap' + i);
  		}
  	}

  	dataChannel.onmessage = function(event)
  	{
  		var msg = JSON.parse(event.data);
  		var trackingRacer = 'CC';

  		if (msg.msgId == 'checkpoint')
  		{
  			if (msg.data.racerId != trackingRacer)
  				return;

	  		$scope.$apply(function(){
	  			rawLapTimes.push(msg.data.time);
	  			$scope.updateLapTimes();
	  		});

	  		if ($scope.lapTimes.length > 0)
	  			notifyAudio($scope.lapTimes[$scope.lapTimes.length - 1]);
  		}

  		if (msg.msgId == 'racingTable')
  		{
  			$scope.$apply(function(){
  				rawLapTimes = msg.data[trackingRacer];
  				$scope.updateLapTimes();
  			});
  		}

  	}

  	$scope.reset = function()	{
  		dataChannel.send('reset');
  	};

  	// pull stats from server
  //	$scope.reset();
  });