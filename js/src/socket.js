var socketUrl = _SETTINGS_socketUrl;

function connect(){
	webSocket = new WebSocket(socketUrl);

	webSocket.onopen = function (e) {
		onOpen (e);
	};

	webSocket.onmessage = function (e) {
		onMessage (e);
	};

	webSocket.onerror = function (e) {
		onError (e);
	};

	webSocket.onclose = function (e) {
		onClose (e);
	};
}

function onOpen(e){
	_isConnected = true;
	console.log("_isConnected: " + _isConnected);

	// New websocket server doesn't need to recieve this
	//webSocket.send("getPlayerData"); // Get any players connected to the server

	$("#connection").removeClass("label-danger")
		.removeClass("label-warning")
		.addClass("label-success").text("connected");
	$("#socket_error").text("");

}
function onMessage(e){
	var m = encodeURIComponent(e.data).match(/%[89ABab]/g);
	var byteSize = e.data.length + (m ? m.length : 0);

	console.log("recieved message (" + byteSize/1024 + " kB)");
	console.log("data: " + e.data);
	var data = JSON.parse(e.data);

	if(data.type == "blips"){

	}else if (data.type == "playerData") {
		console.log("updating players: " + JSON.stringify(data));
		doPlayerUpdate(data.payload);

	}else if(data.type == "playerLeft"){
		console.log("player left:" + data.payload);
		playerLeft(data.payload);
	}
}

function onError(e){
	// from http://stackoverflow.com/a/28396165
	var reason;
	// See http://tools.ietf.org/html/rfc6455#section-7.4.1
	if (event.code == 1000){
		reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
	}else if(event.code == 1001){
		reason = "Server is going down or a browser having navigated away from a page.";
	}else if(event.code == 1002){
		reason = "An endpoint is terminating the connection due to a protocol error";
	}else if(event.code == 1003){
		reason = "Wrong data type recieved by the server";
	}else if(event.code == 1004){
		reason = "Reserved. The specific meaning might be defined in the future.";
	}else if(event.code == 1005){
		reason = "No status code was actually present.";
	}else if(event.code == 1006){
	   reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
	}else if(event.code == 1007){
		reason = "Server has received data within a message that was not consistent with the type of the message.";
	}else if(event.code == 1008){
		reason = "Server has received a message that 'violates its policy'.";
	}else if(event.code == 1009){
	   reason = "Server received a message that is too big for it to process.";
	}else if(event.code == 1010){ // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
		reason = "Client expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake.\n Specifically, the extensions that are needed are: " + event.reason;
	}else if(event.code == 1011){
		reason = "Server encountered an unexpected condition that prevented it from fulfilling the request.";
	}else if(event.code == 1015){
		reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
	}else{
		reason = "Unknown reason (Server is probably down)";
	}

	//$("#socket_error").text(reason);
	console.log("Socket error: " + reason);
}

function onClose(e){
	$("#connection").removeClass("label-success")
		.removeClass("label-warning")
		.addClass("label-danger").text("disconnected");

	_isConnected = false;
}

var localCache = {};

function playerLeft(playerName){
	if (localCache[playerName].marker != null || localCache[playerName].marker != undefined){
		clearMarker(localCache[playerName].marker);
		delete localCache[playerName];
	}

	if ($("#playerSelect option[value='" + playerName + "']").length > 0){
		$("#playerSelect option[value='" + playerName + "']").remove();
	}

	playerCount = Object.keys(localCache).length;
	console.log("Playerleft playercount: " + playerCount);
	$("#player_count").text(playerCount);
}

function getPlayerInfoHtml(plr){
	var html = '<div class="row info-body-row"><strong>Position:</strong>&nbsp;X {' + plr.pos.x.toFixed(4) + "} Y {" + plr.pos.y.toFixed(4) + "} Z {" + plr.pos.z.toFixed(4) + "}</div>";
	for(var key in plr){
		//console.log("found key: "+ key);
		if (key == "name" || key == "pos" || key == "icon"){ // I should probably turn this into a array or something
			continue; // We're already displaying this info
		}
		if(_SETTINGS_showIdentifiers && key == "identifer"){
			html += '<div class="row info-body-row"><strong>Identifer:</strong>&nbsp;' + plr[key] + '</div>';
		}else{
			// some other info.. Show it
			html += '<div class="row info-body-row"><strong>' + key + ':</strong>&nbsp;' + plr[key] + '</div>';
		}
	}

	return html;
}

function doPlayerUpdate(players){
	console.log(players);

	players.forEach(function(plr){
		if (plr == null || plr.name == undefined || plr.name == "") return;

		if ( !(plr.identifer in localCache) ){
			// "localCache" literally just keeps track of the marker.. I should rename it
			//TODO: Rename "localCache" to something better
			localCache[plr.identifer] = { marker: null };
		}

		if ($("#playerSelect option[value='" + plr.identifer + "']").length <= 0){
			// Ooo look, we have players. Let's add them to the "tracker" drop-down
			$("#playerSelect").append($("<option>", {
				value: plr.identifer, // Should be unique
				text: plr.name // Their name.. Might not be unique?
			}));
		}

		if (_trackPlayer != null && _trackPlayer == plr.identifer){
			// If we're tracking a player, make sure we center them
			map.panTo(convertToMapGMAP(plr.pos.x, plr.pos.y));
		}

		if (localCache[plr.identifer].marker != null || localCache[plr.identifer].marker != undefined){
			// If we have a custom icon (we should) use it!!
			if (plr.icon){
				var t = MarkerTypes[plr.icon];
				//console.log("Got icon of :" + plr.icon);
				_MAP_markerStore[localCache[plr.identifer].marker].setIcon({
					url: _MAP_iconURL + t.icon,
					size: t.size,
					origin: t.origin,
					anchor: t.anchor,
					scaledSize: t.scaledSize
				});
			}

			// Update the player's location on the map :)
			_MAP_markerStore[localCache[plr.identifer].marker].setPosition( convertToMapGMAP(plr.pos.x, plr.pos.y) );

			//update popup with the information we have been sent
			var html = getPlayerInfoHtml(plr);

			var infoContent = '<div class="info-window"><div class="info-header-box"><div class="info-header">' + plr.name + '</div></div><div class="clear"></div><div id=info-body>' + html + "</div></div>";
			var infoBox = new google.maps.InfoWindow({
				content: infoContent
			});
			_MAP_markerStore[localCache[plr.identifer].marker].popup.setContent(infoContent);

		}else{

			var obj = new MarkerObject(plr.name, new Coordinates(plr.pos.x, plr.pos.y, plr.pos.z), MarkerTypes[6], "", "", "");
			var m = localCache[plr.identifer].marker = createMarker(false, false, obj, plr.name) - 1;

			var html = getPlayerInfoHtml(plr);

			var infoContent = '<div class="info-window"><div class="info-header-box"><div class="info-icon"></div><div class="info-header">' + plr.name + '</div></div><div class="clear"></div><div id=info-body>' + html + "</div></div>";
			var infoBox = new google.maps.InfoWindow({
				content: infoContent
			});
			_MAP_markerStore[m].popup.setContent(infoContent);

		}

	});

	playerCount = Object.keys(localCache).length;
	console.log("Playerleft playercount: " + playerCount);
	$("#player_count").text(playerCount);
}
