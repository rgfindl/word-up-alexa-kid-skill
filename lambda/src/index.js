'use strict';
const Alexa = require('alexa-sdk');
const _ = require('lodash');

const words = require('./lib/words.json');

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this:  const APP_ID = "amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1";
const APP_ID = 'amzn1.ask.skill.7065ccdb-53e8-42aa-b78a-d8a5d15a5486';

//We have provided two ways to create your quiz questions.  The default way is to phrase all of your questions like: "What is X of Y?"
//If this approach doesn't work for your data, take a look at the commented code in this function.  You can write a different question
//structure for each property of your data.
function getQuestion(word)
{
    return "What is the first letter in the word <break strength=\"medium\"/> <emphasis level=\"strong\">"+word+"</emphasis>?";
}

//This is the function that returns an answer to your user during the quiz.  Much like the "getQuestion" function above, you can use a
//switch() statement to create different responses for each property in your data.  For example, when this quiz has an answer that includes
//a state abbreviation, we add some SSML to make sure that Alexa spells that abbreviation out (instead of trying to pronounce it.)
function getAnswer(word, firstLetter, letterSaid)
{
    return "The letter I heard was "+letterSaid+"<break strength=\"medium\"/> The first letter in the word <emphasis>"+word+"</emphasis> is <break strength=\"medium\"/> <emphasis level=\"strong\">"+firstLetter+"</emphasis> <break strength=\"medium\"/>";
}

//This is a list of positive speechcons that this skill will use when a user gets a correct answer.  For a full list of supported
//speechcons, go here: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speechcon-reference
const speechConsCorrect = ["Booya", "All righty", "Bam", "Bazinga", "Bingo", "Boom", "Bravo", "Cha Ching", "Cheers", "Dynomite",
"Hip hip hooray", "Hurrah", "Hurray", "Huzzah", "Oh dear.  Just kidding.  Hurray", "Kaboom", "Kaching", "Oh snap", "Phew",
"Righto", "Way to go", "Well done", "Whee", "Woo hoo", "Yay", "Wowza", "Yowsa"];

//This is a list of negative speechcons that this skill will use when a user gets an incorrect answer.  For a full list of supported
//speechcons, go here: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speechcon-reference
const speechConsWrong = ["Argh", "Aw man", "Blarg", "Blast", "Boo", "Bummer", "Darn", "D'oh", "Dun dun dun", "Eek", "Honk", "Le sigh",
"Mamma mia", "Oh boy", "Oh dear", "Oof", "Ouch", "Ruh roh", "Shucks", "Uh oh", "Wah wah", "Whoops a daisy", "Yikes"];

//This is the welcome message for when a user starts the skill without a specific intent.
const WELCOME_MESSAGE = "Welcome to the Letter Head Quiz Game!  You can ask me to play the letter song, or you can ask me to start a quiz.  What would you like to do?";

//This is the message a user will hear when they start a quiz.
const START_QUIZ_MESSAGE = "OK.  I will ask you 10 questions.";

//This is the message a user will hear when they try to cancel or stop the skill, or when they finish a quiz.
const EXIT_SKILL_MESSAGE = "Thank you for playing the Letter Head Quiz Game!  Let's play again soon!";

const EXIT_SONG_MESSAGE = 'Thanks for listening to the letter song';

//This is the message a user will hear when they ask Alexa for help in your skill.
const HELP_MESSAGE = "You can ask me to play the letter song.  You can also test your knowledge by asking me to start a quiz.  What would you like to do?";

//This is the message a user will receive after they complete a quiz.  It tells them their final score.
function getFinalScore(score, counter) { return "Your final score is " + score + " out of " + counter + ". "; }


//=========================================================================================================================================
//Editing anything below this line might break your skill.
//=========================================================================================================================================

const counter = 0;

const states = {
    START: "_START",
    QUIZ: "_QUIZ"
};

const SONGS = [
    {
        artist: 'Mary Kate',
        url: 'https://word-up-alexa-kid-skill-publicassetsbucket-fgb1xhh6iib5.s3.amazonaws.com/Mary-Kate_ABC.mp3'
    },
    {
        artist: 'Jacob',
        url: 'https://word-up-alexa-kid-skill-publicassetsbucket-fgb1xhh6iib5.s3.amazonaws.com/Jacob_ABC.mp3'
    }
];

function getRandom(min, max)
{
    return Math.floor(Math.random() * (max-min+1)+min);
}

function getSpeechCon(type)
{
    if (type) return "<say-as interpret-as='interjection'>" + speechConsCorrect[getRandom(0, speechConsCorrect.length-1)] + "! </say-as><break strength='strong'/>";
    else return "<say-as interpret-as='interjection'>" + speechConsWrong[getRandom(0, speechConsWrong.length-1)] + " </say-as><break strength='strong'/>";
}

var audio_controller = function () {
    return {
        play: function (artist) {
            /*
             *  Using the function to begin playing audio when:
             *      Play Audio intent invoked.
             *      Resuming audio when stopped/paused.
             *      Next/Previous commands issued.
             */

            if (!_.isNil(artist)) {
                var song = _.find(SONGS, {artist: artist});
            } else {
                var song = SONGS[getRandom(0,1)];
            }
            const text = 'This is the letter song by '+song.artist;
            const offsetInMilliseconds = 0;

            saveLastPlayed(getUserId(this.event), {
                artist: song.artist,
                offsetInMilliseconds: offsetInMilliseconds
            });

            this.response.speak(text).audioPlayerPlay('REPLACE_ALL', song.url, song.url, null, offsetInMilliseconds);
            this.emit(':responseReady');
        },
        stop: function (text) {
            /*
             *  Issuing AudioPlayer.Stop directive to stop the audio.
             *  Attributes already stored when AudioPlayer.Stopped request received.
             */
            deleteLastPlayed(getUserId(this.event));
            this.response.speak(text).audioPlayerStop();
            this.emit(':responseReady');
        },
        pause: function() {
            console.log('controller.pause');
            this.response.audioPlayerStop();
            this.emit(':responseReady');
        },
        resume: function() {
            var lastPlayed = loadLastPlayed(getUserId(this.event));
            if (_.isNil(lastPlayed)) {
                audio_controller.play.call(this);
            } else {
                var song = _.find(SONGS, {artist: lastPlayed.artist});
                this.response.audioPlayerPlay('REPLACE_ALL', song.url, song.url, null, lastPlayed.offsetInMilliseconds);
                this.emit(':responseReady');
            }
        }
    }
}();

const handlers = {
    "LaunchRequest": function() {
        this.handler.state = states.START;
        this.emitWithState("Start");
    },
    "QuizIntent": function() {
        this.handler.state = states.QUIZ;
        this.emitWithState("Quiz");
    },
    "AMAZON.HelpIntent": function() {
        this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "Unhandled": function() {
        this.handler.state = states.START;
        this.emitWithState("Start");
    }
};

const startHandlers = Alexa.CreateStateHandler(states.START,{
    "Start": function() {
        console.log('Start.Start');
        this.response.speak(WELCOME_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "QuizIntent": function() {
        console.log('Start.QuizIntent');
        this.handler.state = states.QUIZ;
        this.emitWithState("Quiz");
    },
    'SongIntent': function () {
        console.log('Start.SongIntent');
        this.handler.state = '';
        this.emitWithState("SongIntent");
    },
    'MKSongIntent': function () {
        console.log('Start.MKSongIntent');
        this.handler.state = '';
        this.emitWithState("MKSongIntent");
    },
    'JacobSongIntent': function () {
        console.log('Start.JacobSongIntent');
        this.handler.state = '';
        this.emitWithState("JacobSongIntent");
    },
    "AMAZON.StopIntent": function() {
        console.log('Start.AMAZON.StopIntent');
        audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
    },
    "AMAZON.CancelIntent": function() {
        console.log('Start.AMAZON.CancelIntent');
        audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
    },
    "AMAZON.HelpIntent": function() {
        console.log('Start.AMAZON.HelpIntent');
        this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "Unhandled": function() {
        console.log('Start.Unhandled');
        this.emitWithState("Start");
    }
});


const quizHandlers = Alexa.CreateStateHandler(states.QUIZ,{
    "Quiz": function() {
        console.log('Quiz.Quiz');
        this.attributes["response"] = "";
        this.attributes["counter"] = 0;
        this.attributes["quizscore"] = 0;
        this.emitWithState("AskQuestion");
    },
    "AskQuestion": function() {
        console.log('Quiz.AskQuestion');
        if (this.attributes["counter"] == 0)
        {
            this.attributes["response"] = START_QUIZ_MESSAGE + " ";
        }

        let random = getRandom(0, _.size(words)-1);
        let word = words[random];

        this.attributes["quizword"] = word;
        this.attributes["counter"]++;

        let question = getQuestion(word);
        let speech = this.attributes["response"] + question;

        this.emit(":ask", speech, question);
    },
    "AnswerIntent": function() {
        console.log('Quiz.AnswerIntent');
        if (_.isEqual(this.event.request.type, 'SessionEndedRequest')) {
            audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
            return;
        }
        let response = "";
        let speechOutput = "";
        let word = this.attributes["quizword"];
        let firstLetter = _.head(_.split(word, ''));

        if (_.isNil(this.event.request.intent) || _.isNil(this.event.request.intent.slots) || _.isNil(this.event.request.intent.slots.Letter)) {
            audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
            return;
        }

        let wordSaid = this.event.request.intent.slots.Letter.value;

        if (_.isNil(wordSaid) || _.isEmpty(_.trim(wordSaid))) {
            audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
            return;
        }

        const letterSaid = _.head(_.split(wordSaid, ''));
        const correct = !_.isNil(letterSaid) && _.size(wordSaid) <= 2 && _.isEqual(_.toLower(letterSaid), _.toLower(firstLetter));

        console.log('Word: '+word);
        console.log('First letter: '+firstLetter);
        console.log('Said: '+ wordSaid);
        console.log('Letter said: '+letterSaid);

        if (correct)
        {
            response = getSpeechCon(true);
            this.attributes["quizscore"]++;
        }
        else
        {
            response = getSpeechCon(false);
            response += getAnswer(word, firstLetter, letterSaid);
        }

        if (this.attributes["counter"] < 10)
        {
            this.attributes["response"] = response;
            this.emitWithState("AskQuestion");
        }
        else
        {
            response += getFinalScore(this.attributes["quizscore"], this.attributes["counter"]);
            speechOutput = response + " " + EXIT_SKILL_MESSAGE;

            this.response.speak(speechOutput);
            this.emit(":responseReady");
        }
    },
    "AMAZON.RepeatIntent": function() {
        console.log('Quiz.AMAZON.RepeatIntent');
        let question = getQuestion(this.attributes["counter"], this.attributes["quizword"]);
        this.response.speak(question).listen(question);
        this.emit(":responseReady");
    },
    "AMAZON.StartOverIntent": function() {
        console.log('Quiz.AMAZON.StartOverIntent');
        this.emitWithState("Quiz");
    },
    "AMAZON.StopIntent": function() {
        console.log('Quiz.AMAZON.StopIntent');
        audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
    },
    "AMAZON.CancelIntent": function() {
        console.log('Quiz.AMAZON.CancelIntent');
        audio_controller.stop.call(this, EXIT_SKILL_MESSAGE);
    },
    "AMAZON.HelpIntent": function() {
        console.log('Quiz.AMAZON.HelpIntent');
        this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "Unhandled": function() {
        console.log('Quiz.AnswerIntent');
        this.emitWithState("AnswerIntent");
    }
});

// Saves information into our super simple, not-production-grade cache
var lastPlayedByUser = {};

function saveLastPlayed(userId, lastPlayed) {
    console.log('saveLastPlayed');
    console.log(userId);
    console.log(JSON.stringify(lastPlayed, null, 3));
    lastPlayedByUser[userId] = lastPlayed;
};

function deleteLastPlayed(userId) {
    console.log('deleteLastPlayed');
    console.log(userId);
    if (!_.isNil(userId) && !_.isNil(lastPlayedByUser[userId])) {
        delete lastPlayedByUser[userId];
    }
};

// Load information from our super simple, not-production-grade cache
function loadLastPlayed(userId) {
    console.log('loadLastPlayed');
    console.log(userId);
    var lastPlayed = null;
    if (userId in lastPlayedByUser) {
        lastPlayed = lastPlayedByUser[userId];
    }
    return lastPlayed;
};

function getUserId(event) {
  return event.context ? event.context.System.user.userId : event.session.user.userId;
};

var audio_handlers = {
    stateHandlers: {
        'SongIntent': function () {
            console.log('SongIntent');
            // play the radio
            audio_controller.play.call(this);
        },
        'MKSongIntent': function () {
            console.log('MKSongIntent');
            // play the radio
            audio_controller.play.call(this, 'Mary Kate');
        },
        'JacobSongIntent': function () {
            console.log('JacobSongIntent');
            // play the radio
            audio_controller.play.call(this, 'Jacob');
        },

        'AMAZON.NextIntent': function () {
            console.log('AMAZON.NextIntent');
            this.emit(':responseReady');
        },
        'AMAZON.PreviousIntent': function () {
            console.log('AMAZON.PreviousIntent');
            this.emit(':responseReady');
        },
        'AMAZON.CancelIntent':  function () {
            console.log('AMAZON.CancelIntent');
            audio_controller.stop.call(this, EXIT_SONG_MESSAGE)
        },
        'AMAZON.StopIntent':    function () {
            console.log('AMAZON.StopIntent');
            audio_controller.stop.call(this, EXIT_SONG_MESSAGE)
        },

        'AMAZON.PauseIntent':   function () {
            console.log('AMAZON.PauseIntent');
            audio_controller.pause.call(this)
        },
        'AMAZON.ResumeIntent':  function () {
            console.log('AMAZON.ResumeIntent');
            audio_controller.resume.call(this);
        },

        'AMAZON.LoopOnIntent':     function () { this.emit('AMAZON.StartOverIntent');},
        'AMAZON.LoopOffIntent':    function () { this.emit('AMAZON.StartOverIntent');},
        'AMAZON.ShuffleOnIntent':  function () { this.emit('AMAZON.StartOverIntent');},
        'AMAZON.ShuffleOffIntent': function () { this.emit('AMAZON.StartOverIntent');},
        'AMAZON.StartOverIntent':  function () { this.emit(':responseReady');}
    },
    audioEventHandlers: {
        'PlaybackStarted' : function () {
            /*
             * AudioPlayer.PlaybackStarted Directive received.
             * Confirming that requested audio file began playing.
             * Do not send any specific response.
             */
            console.log("Playback started");
            this.emit(':responseReady');
        },
        'PlaybackFinished' : function () {
            /*
             * AudioPlayer.PlaybackFinished Directive received.
             * Confirming that audio file completed playing.
             * Do not send any specific response.
             */
            console.log("Playback finished");
            deleteLastPlayed(getUserId(this.event));
            this.emit(':responseReady');
        },
        'PlaybackStopped' : function () {
            /*
             * AudioPlayer.PlaybackStopped Directive received.
             * Confirming that audio file stopped playing.
             */
            console.log("Playback stopped");

            var userId = getUserId(this.event);
            var lastPlayed = loadLastPlayed(userId);
            if (!_.isNil(lastPlayed)) {
                lastPlayed.offsetInMilliseconds = this.event.context.AudioPlayer.offsetInMilliseconds;
                saveLastPlayed(userId, lastPlayed);
            }

            //do not return a response, as per https://developer.amazon.com/docs/custom-skills/audioplayer-interface-reference.html#playbackstopped
            this.emit(':responseReady');
        },
        'PlaybackNearlyFinished' : function () {
            /*
             * AudioPlayer.PlaybackNearlyFinished Directive received.
             * Replacing queue with the URL again.
             * This should not happen on live streams
             */
            console.log("Playback nearly finished");
            //this.response.audioPlayerPlay('REPLACE_ALL', audioData.url, audioData.url, null, 0);
            this.emit(':responseReady');
        },
        'PlaybackFailed' : function () {
            /*
             * AudioPlayer.PlaybackFailed Directive received.
             * Logging the error and restarting playing.
             */
            console.log("Playback Failed : %j", this.event.request.error);
            this.response.audioPlayerClearQueue('CLEAR_ENQUEUED');
            this.emit(':responseReady');
        }
    }
};

exports.handler = (event, context) => {
    console.log(JSON.stringify(event, null, 3));
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers, startHandlers, quizHandlers, audio_handlers.audioEventHandlers, audio_handlers.stateHandlers);
    alexa.execute();
};
