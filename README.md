Circuit Trivia Bot
==================================
## Description
This application is a bot used to moderate a trivia session. The creator of the trivia can add the bot to a DIRECT conversation and mention the trivia bot to begin the creation of a trivia session. The trivia bot will offer a maximum of 10 questions you may pose the participants of another conversation. Hit the "Start session now" button to begin the session. Participants will be notified then the quiz will shortly being, participants have 10 seconds to answer each question and the first person to answer will be awarded 2 points where subsequent answers will get 1 point. At the end of the trivia session the top 3 winners are posted in the conversation along with their point totals.
## Prerequisites
[![NodeJS](https://img.shields.io/badge/Node.js-6.10.2-brightgreen.svg)](https://nodejs.org) <br/>
* Developer account on circuitsandbox.net. Get it for free at [developer registration](https://circuit.github.io/).
* OAuth 2.0 `client_id` and optionally `client_secret`. Get if for free at [circuit.github.com/oauth](https://circuit.github.com/oauth).

## Dependencies
* [circuit-sdk](https://www.npmjs.com/package/circuit-sdk)

## REST Reference
Other examples of RESTful API's with circuit can be found [here](https://circuitsandbox.net/rest/v2/swagger/ui/index.html).

## Usage
1. Clone the respository.
2. Run : `$ npm install`.
3. Rename `config.json.template` to `config.json` after adding your `client_id`, `client_secret`, `moderatorConversationId`, and the `quizConversationId` the for the trivia session. The `moderatorConversationId` field should refer to the DIRECT conversation Id the host will have with the bot to create the trivia session. The `quizConversationId` should refer to the conversation Id the trivia session will take place in.
* Note: The bot must be a part of the conversations it is listening to.
4. To begin creating the trivia game mention the bot by typing `@triviaBotName new session` in the conversation referred to be the `moderatorConversationId` and the bot will post a form for you to fill out. There is an optional field for the title of the quiz, default will be the date. After you fill out the form you can click "Start session now" to begin.