
var https = require('https');
var http = require('http');
var parkList = require('./parks');
var stateList = require('./states');

var NPS_URL = 'https://developer.nps.gov/api/v0/parks?parkCode=';
var WEATHER_URL = 'http://api.openweathermap.org/data/2.5/weather?APPID=';
var NPS_API_KEY = 'A1E7C69D-4756-4D69-AD04-B1633E65064F';
var OPEN_WEATHER_API_KEY = 'ade6b9686ebe18df4e82898146d1132f';

module.exports = {
   findParkIndex,
   findStateName,
   findStateAbbrev,
   getJsonFromNPS,
   getParksByState,
   getJsonFromWeather,
   parseParkListByState
}

/*
*   Find park in list and return index. Else return -1.
*/
function findParkIndex(park) {
    var i, index = -1;
    for (i = 0; i < parkList.length; i++) {
        if (park.toLowerCase() == parkList[i].parkName.toLowerCase()) {
            // Found it
            index = i;
            break;
        }
    }
    return index;
}

/*
*   Find full name of state abbreviation
*/
function findStateName(abbrev) {
    var i, index = -1;
    for (i = 0; i < stateList.length; i++) {
        if (abbrev.toUpperCase() == stateList[i].abbrev) {
            return stateList[i].state;
        }
    }
    return "";
}

/*
*   Find abbreviation of given U.S. state
*/
function findStateAbbrev(state) {
    var i, index = -1;
    for (i = 0; i < stateList.length; i++) {
        if (state.toLowerCase() == stateList[i].state.toLowerCase()) {
            return stateList[i].abbrev;
        }
    }
    return "";
}

/**
*   Call NPS (National Park Service) API to get park information.
*/
function getJsonFromNPS(park, eventCallback) {
    var options = {
      host: 'developer.nps.gov',
      path: '/api/v0/parks?parkCode=' + park,
      method: 'GET',
      headers: {
        'Authorization': NPS_API_KEY
      }
    };

    https.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = JSON.parse(body);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}


/**
*   Call NPS (National Park Service) API to get list of parks in the given state.
*/
function getParksByState(state, eventCallback) {
    var options = {
      host: 'developer.nps.gov',
      path: '/api/v0/parks?stateCode=' + state,
      method: 'GET',
      headers: {
        'Authorization': NPS_API_KEY
      }
    };

    https.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = JSON.parse(body);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

/**
*   Call OpenWeatherMap API to get weather for given lat/long.
*/
function getJsonFromWeather(latLong, eventCallback) {
    latLong = latLong.replace('lat:','&lat=');
    latLong = latLong.replace(', long:','&lon=');

    http.get(WEATHER_URL + OPEN_WEATHER_API_KEY + '&units=imperial' + latLong, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = JSON.parse(body);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

/*
 *  Parse result from call to NPS API for list of parks in given state.
 *  Can be zero parks.
*/
function parseParkListByState(result) {
  var count = 0;
  var list = "";
  var total = result.total;

  for (var i = 0; i < total; i++) {
    var park = result.data[i];
    if (park.designation.toLowerCase().indexOf('national park') > -1 ||
        park.designation.toLowerCase().indexOf('national and state parks') > -1) {
      var parkName = park.name;
      parkName = parkName.replace('&#257;', 'a'); // Haleakala
      parkName = parkName.replace('&', ' and ');  // Sequoia & Kings Canyon, possibly others
      if (parkName.toLowerCase().indexOf('sequoia') == 0) {
        parkName = 'Sequoia';
      }

      if (count == 0) {
        list = parkName;
      } else {
        list = list + ", " + parkName;
      }
      count++;
    }
  }

  if (count == 0) {
    return "has no national parks."
  } else {
    var natlPark;
    if (count == 1) {
      natlPark = " national park: ";
    } else {
      natlPark = " national parks: ";
    }
    return "has " + count + natlPark + list;
  }

}
