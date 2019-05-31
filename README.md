# Circuit Trivia Quiz

This application is a bot used to moderate a trivia session. The creator of the trivia can add the bot to a conversation and mention the trivia bot to begin the creation of a trivia session. The trivia bot will offer a maximum of 10 questions you may pose the participants of another conversation. Hit the "Start session now" button to begin the session. Participants will be notified then the quiz will shortly begin, participants have 20 seconds to answer each question and the first person to answer will be awarded 2 points where subsequent answers will get 1 point. At the end of the trivia session the top 3 winners are posted in the conversation along with their point totals. The results of the quiz is also posted in the original conversation, or a private converation, in a `results.json` file for analysis.

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
3. Add `CLIENT_ID`, `CLIENT_SECRET`, `DOMAIN`, and `SCOPES` to the process environment variables for the trivia session.
4. To begin creating the trivia game mention the bot by typing `@triviaBotName new session` and you will be prompted to choose the conversation Id to host the quiz. You may also choose the thread Id that you want to host the quiz on and the number of questions to show, default is 10. Another feature is choosing whether to award points or not by selecting the check box. You may also upload a `.json` file attatched to the mention fo the bot to have it use questions from the file instead of filling out a quiz by default.
** Note an example quiz in `example-quiz.json` can be seen to format a premade quiz. **
