
/**
 * This Alexa skill gives you basic information about the U.S. parks that are designated as
 * a "national park".
 */

/**
 * App ID for the skill
 */
var APP_ID = undefined; // OPTIONAL: replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');
var parkList = require('./parks');
var utils = require('./utils');

/**
 * URLs for NPS, Wikipedia, and OpenWeather APIs
 */
var S3_BUCKET = 'https://s3.amazonaws.com/natlparks.loudlr.com/';


var cardTitle = 'U.S. National Parks';
var sessionAttributes = {};
var parkIndex = -1;
var parkName = "";
var npsData;

var NatlParkSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
NatlParkSkill.prototype = Object.create(AlexaSkill.prototype);
NatlParkSkill.prototype.constructor = NatlParkSkill;

NatlParkSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("NatlParkSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

NatlParkSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("NatlParkSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

NatlParkSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

NatlParkSkill.prototype.intentHandlers = {
    "GetParkIntent": function (intent, session, response) {
        handleParkRequest(intent, session, response);
    },

    "GetWeatherIntent": function (intent, session, response) {
        handleWeatherRequest(intent, session, response);
    },

    "GetDirectionsIntent": function (intent, session, response) {
        handleDirectionsRequest(intent, session, response);
    },

    "GetLocationIntent": function (intent, session, response) {
        handleLocationRequest(intent, session, response);
    },

    "GetStateIntent": function (intent, session, response) {
        handleStateRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "With the National Parks skill, you can get basic information about U.S. national parks. " +
            "After selecting a park, you can say weather, " +
            "location, or directions. You can also name a state to get a list of parks for a state. " +
            "For example, you can say Yosemite, or California. " +
            "Now, which park or state do you want?";
        var repromptText = "Which park or state do you want?";
        var speechOutput = {
            speech: "<speak>" + speechText + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var audio = '<audio src="' + S3_BUCKET + "warbler.mp3" + '"/>';
        var speechOutput = {
                speech: "<speak>" + "Thanks for visiting." + audio + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var audio = '<audio src="' + S3_BUCKET + "warbler.mp3" + '"/>';
        var speechOutput = {
                speech: "<speak>" + "Thanks for visiting." + audio + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
        };
        response.tell(speechOutput);
    }
};

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var repromptText = "With National Parks, you can get basic information about U.S. national parks " +
            " by saying a park name. You can also name a state to get a list of parks for a state. " +
            "For example, you can say Yosemite, or California. " +
            "Now, which park or state do you want?";
    var speechText = "Welcome to National Parks. Which park or state do you want information for?";

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.ask(speechOutput, repromptOutput);
}

/**
 * Park request.
 */
function handleParkRequest(intent, session, response) {
    var parkSlot = intent.slots.park.value;
    var speechText;
    var speechOutput;
    var repromptOutput;
    var repromptText = "Please name a park or a state.";

    if (parkSlot) {
        parkName = parkSlot;
        parkIndex = utils.findParkIndex(parkSlot);
        if (parkIndex == -1) {
            // Handle unknown park case
            speechText = "I'm unable to find information for " + parkName + ". Please name another park or a state.";
            speechOutput = {
                    speech: "<speak>" + speechText + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
            repromptOutput = {
                    speech: repromptText,
                    type: AlexaSkill.speechOutputType.PLAIN_TEXT
                };
            response.ask(speechOutput, repromptOutput);

        } else {
            // Handle park found case
            var parkCode = parkList[parkIndex].parkCode;
            respondToParkRequest(parkIndex, parkCode, response);
        }

    } else {
        // Will this code ever get executed?
        speechText = "Which park or state do you want information for?";
        speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
        };
        repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    }
}

/**
 * Respond to park request.
 */
function respondToParkRequest(parkIndex, parkCode, response) {
  var speechText;
  var speechOutput;
  var repromptOutput;
  var repromptText = "Please name a park or a state.";
  var cardContent;

  utils.getJsonFromNPS(parkCode, function (result) {
      if (result.length == 0) {
          speechText = "There is no information found for " + parkName +
            ". Please name another park or a state.";
          response.ask(speechText);
      } else {
          npsData = result.data[0]; // Save it for later
          var descr = npsData.description;
          var audio = parkList[parkIndex].audio;
          speechText = '<audio src="' + S3_BUCKET + audio + '"/>' + descr;
          repromptText = 'To continue, you can say weather, or location, or directions. Or you can ask for another park or a state.';
          speechOutput = {
              speech: "<speak>" + speechText + '<break time="1s"/>' + repromptText + "</speak>",
              type: AlexaSkill.speechOutputType.SSML
          };
          repromptOutput = {
                  speech: repromptText,
                  type: AlexaSkill.speechOutputType.PLAIN_TEXT
              };
          cardTitle = npsData.fullName;
          cardContent = "More info at " + npsData.url;

          response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
      }
  });
}

/**
 * Weather request.
 */
function handleWeatherRequest(intent, session, response) {
    var speechText;
    var speechOutput;
    var repromptOutput;
    var repromptText = "You can say location or directions. Or you can ask for another park or a state.";
    var cardContent;

    if (parkIndex == -1) {
        speechText = "Please name a park or a state.";
        repromptText = "Please name a park or a state.";
        speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
        repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
        response.ask(speechOutput, repromptOutput);

    } else {
        var latLong = npsData.latLong;
        if (latLong.length == 0) {
          speechText = 'Sorry but weather is not available for ' + parkName + '. Anything else?';
          repromptText = 'To continue, you can say Location, or Directions. Or you can ask for another park or a state.';
          speechOutput = {
              speech: "<speak>" + speechText + "</speak>",
              type: AlexaSkill.speechOutputType.SSML
          };
          repromptOutput = {
                  speech: repromptText,
                  type: AlexaSkill.speechOutputType.PLAIN_TEXT
          };
          response.ask(speechOutput, repromptOutput);
        } else {
          respondToWeatherRequest(latLong, response);
        }
    }
}

/**
 * Respond to weather request.
 */
function respondToWeatherRequest(latLong, response) {
  utils.getJsonFromWeather(latLong, function (result) {
      if (result.length == 0) {
          speechText = "There is no weather found for " + parkName +
              ". Please name another park or a state.";
          response.ask(speechText);
      } else {
          var descr = result.weather[0].description;
          var temps = Math.round(result.main.temp);
          speechText = 'The weather at ' + parkName + ' is ' + descr + ' with a temperature of ' +
              temps + ' degrees. Anything else?';
          repromptText = 'You can say Location, or Directions. Or you can ask for another park or a state.';
          speechOutput = {
              speech: "<speak>" + speechText + "</speak>",
              type: AlexaSkill.speechOutputType.SSML
          };
          repromptOutput = {
                  speech: repromptText,
                  type: AlexaSkill.speechOutputType.PLAIN_TEXT
          };
          response.ask(speechOutput, repromptOutput);
      }
  });
}

/**
 * Directions request.
 */
function handleDirectionsRequest(intent, session, response) {
    var speechText;
    var speechOutput;
    var repromptOutput;
    var repromptText;

    if (parkIndex == -1) {
        speechText = "Please name a park or a state.";
        repromptText = "Please name a park or a state.";
        speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
        repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
        response.ask(speechOutput, repromptOutput);

    } else {
        var directions = npsData.directionsInfo;
        directions = directions.replace('\n\n', '<break time="1s"/>');
        directions = directions.replace('\n', '<break time="1s"/>');

        speechText = directions + " Anything else?";
        repromptText = 'To continue, you can say Weather, or Location. Or you can ask for another park or a state.';
        speechOutput = {
            speech: "<speak>" + speechText + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

        response.ask(speechOutput, repromptOutput);
    }
}

/**
 * Location request.
 */
function handleLocationRequest(intent, session, response) {
    var speechText;
    var speechOutput;
    var repromptOutput;
    var repromptText;

    if (parkIndex == -1) {
        speechText = "Please name a park or a state.";
        repromptText = "Please name a park or a state.";
        speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
        repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
        response.ask(speechOutput, repromptOutput);
        return;
    }

    var state;
    // Handle parks that cover multiple states
    if (parkName.toLowerCase() == "yellowstone") {
        state = "Wyoming, Montana, and Idaho";
    } else if (parkName.toLowerCase() == "great smoky mountains") {
        state = "Tennessee and North Carolina";
    } else if (parkName.toLowerCase() == "death valley") {
        state = "California and Nevada";
    } else {
        var state = utils.findStateName(npsData.states);
    }
    if (state == "") {
      speechText = "I'm sorry. I'm unable to find the location of " + parkName;
    } else {
      speechText = parkName + " is in " + state + ".";
    }
    speechText = speechText + " Anything else?";
    repromptText = 'You can say weather, or directions. Or you can ask for another park or a state.';
    speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.ask(speechOutput, repromptOutput);
}

/**
 * Find parks for a given U.S. state
 */
function handleStateRequest(intent, session, response) {
    var stateSlot = intent.slots.state.value;
    var speechText;
    var speechOutput;
    var repromptOutput;
    var repromptText = "To continue, name a park or a state.";
    var cardContent;

    if (stateSlot) {
        var stateAbbrev = utils.findStateAbbrev(stateSlot);
        if (stateAbbrev.length == 0) {
            speechText = "I'm unable to find information for " + stateSlot + ". Please name a park or another state.";
            speechOutput = {
                    speech: "<speak>" + speechText + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
            repromptOutput = {
                    speech: repromptText,
                    type: AlexaSkill.speechOutputType.PLAIN_TEXT
                };
            response.ask(speechOutput, repromptOutput);

        } else {
            respondToStateRequest(stateAbbrev, stateSlot, response);
        }

    } else {
        speechText = "Please name a park or ask for another state.";
        speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
        repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
        response.ask(speechOutput, repromptOutput);
    }
}

/**
 * Respond to state request
 */
function respondToStateRequest(stateAbbrev, stateSlot, response) {
  var speechText;
  var speechOutput;
  var repromptOutput;
  var repromptText = "To continue, name a park or a state.";
  var cardContent;

  utils.getParksByState(stateAbbrev, function (result) {
      if (result.length == 0) {
          speechText = "There is no information found for " + stateSlot;
          response.tell(speechText);
      } else {
          speechText = stateSlot + " " + utils.parseParkListByState(result);
          repromptText = 'To continue, name a park or another state.';
          speechOutput = {
              speech: "<speak>" + speechText + '<break time="1s"/>' + repromptText + "</speak>",
              type: AlexaSkill.speechOutputType.SSML
          };
          repromptOutput = {
                  speech: repromptText,
                  type: AlexaSkill.speechOutputType.PLAIN_TEXT
              };
          cardTitle = "National parks in " + stateSlot;
          cardContent = speechText;

          response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
      }
  });
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the NatlPark Skill.
    var skill = new NatlParkSkill();
    skill.execute(event, context);
};
