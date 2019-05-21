Circuit Trivia Bot
==================================
## Description
This application is a bot used to moderate a trivia session. The creator of the trivia can add the bot to a conversation and mention the trivia bot to begin the creation of a trivia session. The trivia bot will offer a maximum of 10 questions you may pose the participants of another conversation. Hit the "Start session now" button to begin the session. Participants will be notified then the quiz will shortly begin, participants have 20 seconds to answer each question and the first person to answer will be awarded 2 points where subsequent answers will get 1 point. At the end of the trivia session the top 3 winners are posted in the conversation along with their point totals.
## Prerequisites
[![NodeJS](https://img.shields.io/badge/Node.js-6.10.2-brightgreen.svg)](https://nodejs.org) <br/>
* Developer account on circuitsandbox.net. Get it for free at [developer registration](https://circuit.github.io/).
* OAuth 2.0 `client_id` and `client_secret`. Start developing your app in our sandbox environment.
If you do not have one yet, [request your sandbox](https://yourcircuit.typeform.com/to/d3VDXN). Go create an app, go to the "Manage Applications" > "Custom Apps" and click "Create" and create a "Client Credentials" application.

## Dependencies
* [circuit-sdk](https://www.npmjs.com/package/circuit-sdk)

## Usage
1. Clone the respository.
2. Run : `$ npm install`.
3. Add `CLIENT_ID`, `CLIENT_SECRET`, `DOMAIN`, `SCOPES`, `MODERATOR_CONVERSATION_ID`, and `QUIZ_CONVERSATION_ID` to the process environment variables for the trivia session. The `MODERATOR_CONVERSATION_ID` field should refer to the conversation Id the host will have with the bot to create the trivia session. The `QUIZ_CONVERSATION_ID` should refer to the conversation Id the trivia session will take place in.
* Note: The bot must be a part of the conversations it is listening to.
4. To begin creating the trivia game mention the bot by typing `@triviaBotName new session` in the conversation referred to be the `MODERATOR_CONVERSATION_ID` and the bot will post a form for you to fill out. There is an optional field for the title of the quiz, default will be the date. After you fill out the form you can click "Start session now" to begin.