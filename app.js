const Circuit = require('circuit-sdk');
const fetch = require('node-fetch');
const FileAPI = require('file-api');
const File = FileAPI.File;
const client = new Circuit.Client({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    domain: process.env.DOMAIN,
    scope: process.env.SCOPES
});

const TIME_DELAY = 20; // Delay to wait between questions
const DEFAULT_NUMBER_OF_QUESTIONS = 10; // Default number of questions for the quiz
const CHARACTER_LIMIT = 400; // Character limit per question or answer
let bot; // Bot to manage the trivia session
const quizSessions = {}; // Hash map of quiz sessions 
const conversationsPromptHashMap = {}; // Hash map of conversation prompts 

// Promt user for the conversation Id corresponding where the trivia quiz should be hosted
const promptForConversation = async (item) => {
    const sessionId = `${Date.now()}_${Math.random()}`;
    conversationsPromptHashMap[sessionId] = {
        creatorId: item.creatorId,
        sessionId: sessionId,
        convId: item.convId,
        itemId: item.itemId
    };
    const form = {
        title: 'Trivia Quiz',
        id: sessionId,
        controls: [{
            type: 'LABEL',
            text: 'Enter the conversation Id of which you want to host the trivia quiz.'
        }, {
            type: 'INPUT',
            name: `convId`,
            text: 'Conversation Id',
        }, {
            type: 'LABEL',
            text: 'Enter the number of questions for the quiz (defaults to 10 questions)'
        }, {
            type: 'INPUT',
            name: `questions`,
            text: 'Number of questions',
        }, {
            type: 'BUTTON', // submit the form
            options: [{
                text: 'Submit',
                action: 'submit',
                notification: 'Form submitted successfully'
            }]
        }]
    };
    // if (item.attachments && item.attachments.length) {
    //     const url = item.attachments[0].url;
    //     const res = await fetch(url, {
    //         headers: { 'Authorization': 'Bearer ' + client.accessToken }
    //       });
    //       conversationsPromptHashMap[sessionId].file = await res.json();
    // } 
    await client.addTextItem(item.convId, {
        parentId: item.parentItemId || item.itemId,
        form: form
    });
    console.log('Prompt user for conversation Id');
}
// Create the blank form for the moderator to fill out
const createBlankForm = async (session, convId, numberOfQuestions) => {
    let controls = [{
        type: 'INPUT',
        name: `title`, // optional
        text: 'Enter an optional title',
    }];
    for (let i = 1; i <= numberOfQuestions; i++) {
        const question = [{
            type: 'LABEL',
            text: `Question ${i}`
        }, {
            type: 'INPUT',
            name: `question${i}`,
            text: 'Enter the question here...',
            rows: 4
        }, {
            type: 'LABEL',
            text: `Answer A:`
        }, {
            type: 'INPUT',
            name: `answerA${Date.now()}_${Math.random()}`,
            text: 'Enter the answer for A here...',
            rows: 2
        }, {
            type: 'LABEL',
            text: `Answer B:`
        }, {
            type: 'INPUT',
            name: `answerB${Date.now()}_${Math.random()}`,
            text: 'Enter the answer for B here...',
            rows: 2
        }, {
            type: 'LABEL',
            text: `Answer C:`
        }, {
            type: 'INPUT',
            name: `answerC${Date.now()}_${Math.random()}`,
            text: 'Enter the answer for C here...',
            rows: 2
        }, {
            type: 'LABEL',
            text: `Answer D:`
        }, {
            type: 'INPUT',
            name: `answerD${Date.now()}_${Math.random()}`,
            text: 'Enter the answer for D here...',
            rows: 2
        }, {
            type: 'LABEL',
            text: `Select which answer is correct below...`
        }, {
            name: `${Date.now()}${i}`,
            type: 'RADIO',
            text: 'Select an answer to the question',
            options: [{
                text: 'A',
                value: '0', // Each value will correspond to the array index
                defaultValue: 'false'
              }, {
                text: 'B',
                value: '1',
                defaultValue: 'false'
              }, {
                text: 'C',
                value: '2',
                defaultValue: 'false'
              }, {
                text: 'D',
                value: '3',
                defaultValue: 'false'
              }]
        }];
        controls = [...controls, ...question];
    }
    const actionButtons = [{
        type: 'BUTTON', // submit the form
        options: [{
            text: 'Start session now',
            action: 'submit',
            notification: 'Form submitted successfully'
        }, {
            text: 'Cancel',
            action: 'reset',
            notification: 'Form cancelled successfully'
        }]
    }];
    controls = [...controls, ...actionButtons];
    const form = {
        title: 'Trivia Quiz',
        id: convId,
        controls: controls
    };
    const content = {
        content: '**Note forms will be lost if you navigate away from this conversation**',
        form: form
    };
    const quizForm = await client.addTextItem(session.convId, content);
    delete conversationsPromptHashMap[session.sessionId]; // No longer need the session to cache form asking for the conversation Id
    quizSessions[convId] = {
        sessionId: convId,
        quizConvId: convId,
        creatorId: session.creatorId,
        form: quizForm,
        moderatorConvId: session.convId,
        quizAnswers: {},
        participantScoresHashMap: {}
    }
}

// Creates a form for each question
const createForm = (session, question, answers, total) => {
    const formId = `${total}_${Date.now()}`;
    const answerIndex = Number(answers[4].value) // Index of the answer
    // Save questions an answers in a hash map for later
    session.quizAnswers[formId] = {
        answer: {
            value: answers[answerIndex].value,
            index: answerIndex
        },
        question: question.value
    };
    const form = {
        title: `Question ${total}`,
        id: formId,
        controls: [{
            type: 'LABEL',
            text: question.value
        }, {
            name: 'choices',
            type: 'RADIO',
            options: [{
                text: `A. ${answers[0].value}`,
                value: '0'
              }, {
                text: `B. ${answers[1].value}`,
                value: '1'
              }, {
                text: `C. ${answers[2].value}`,
                value: '2'
              }, {
                text: `D. ${answers[3].value}`,
                value: '3'
              }]
          }, {
            type: 'BUTTON', // submit the form
            options: [{
                text: 'Submit',
                action: 'submit',
                notification: 'Form submitted successfully'
            }]
        }]
    };
    return form;
}

// Chooses the winners and posts results to the conversation
const chooseWinners = async (session, itemId) => {
    const participantScoresHashMap = session.participantScoresHashMap;
    await sleep(TIME_DELAY / 2);
    await client.addTextItem(session.quizConvId , {
        parentId: itemId,
        content: 'And the winners are...'
    });
    await sleep(TIME_DELAY / 4);
    const participants = Object.keys(participantScoresHashMap).map(userId => {
        return { userId: userId, score: participantScoresHashMap[userId].score };
    });
    let winnersScores = [];
    let currScore = 1;
    // Sort particpants based on their scores to choose winner
    participants.sort((a,b) => a.score > b.score ? -1 : 1);
    participants.some(p => {
        if (winnersScores.length > 2 && p.score < currScore) {
            return true;
        }
        currScore = p.score;
        winnersScores.push(p);
    });
    winnersScores = winnersScores.filter(s => s.score > 0);
    const winnerUserIds = winnersScores.map(w => w.userId);
    const winners = !!winnerUserIds.length && await client.getUsersById(winnerUserIds);
    let content = !winners ? 'Sorry there were no winners.' : '<b>Winners:</b>\n';
    let place = 1;
    for (let i = 0 ; i < winnersScores.length; i++) {
        currScore = winnersScores[i].score;
        const firstWinner = winners.find(u => u.userId === winnersScores[i].userId);
        let winnerText = `${place}. ${firstWinner.displayName}`;
        while (i < winnersScores.length && winnersScores[i + 1] && winnersScores[i + 1].score === currScore) {
            const win = winners.find(u => u.userId === winnersScores[i + 1].userId);
            winnerText += `, ${win.displayName}`;
            i++;
        }
        winnerText += ` - ${currScore} points\n`
        content += winnerText;
        place++;
    }
    const users = await client.getUsersById(Object.keys(participantScoresHashMap));
    users.sort((a, b) => a.displayName > b.displayName ? 1 : -1);
    content += `\n\n<b>Trivia Full Results (in alphabetical order) - Total participants: ${users.length}</b>\n`;
    users.forEach(user => {
        content += `${user.displayName} - ${participantScoresHashMap[user.userId] && participantScoresHashMap[user.userId].score} points\n`;
    });
    if (!content.length) {
        return;
    }
    await client.addTextItem(session.quizConvId , {
        parentId: itemId,
        content: content
    });
    const jsonFileAnswers = [];
    users.forEach(user => {
        const data = {
            userId: user.userId,
            name: user.displayName,
            score: participantScoresHashMap[user.userId].score,
            answers: []
        }
        const answers = participantScoresHashMap[user.userId].answers;
        Object.keys(answers).forEach(answer => {
            data.answers.push(answers[answer]);
        });
        jsonFileAnswers.push(data);
    });
    // Get the parent item of the quiz to obtain the title of the trivia quiz
    const parentItem = await client.getItemById(itemId);
    const fileBuffer = new File({
        name: `results.json`,
        type: 'fsify.FILE',
        buffer: Buffer.from(JSON.stringify(jsonFileAnswers, null, 4))
    });
    const results = {
        subject: `${parentItem.text.subject} - Total participants: ${users.length}`,
        content: `Attatched are the results of the trivia quit.`,
        attachments: [fileBuffer]
    };
    // Upload the results of the trivia to the moderated conversation in JSON format
    // If moderated conversation and quiz conversation are the same, post results ina  direct conversation between the bot and creator
    if (session.quizConvId === session.moderatorConvId) {
        const conversation = await client.getDirectConversationWithUser(session.creatorId, true);
        await client.addTextItem(conversation.convId, results);
    } else {
        await client.addTextItem(session.moderatorConvId, results);
    }
}

// Created a new session from the form and runs the quiz
const createNewSession = async (formEvt) => {
    const form = formEvt.form;
    const session = quizSessions[form.id];
    session.questions = [];
    const title = form.data[0];
    let total = 0;
    for (let i = 1; i < form.data.length; i += 6) {
        const question = form.data[i];
        const answers = form.data.slice(i + 1, i + 6);
        if (isValidQuestion(question, answers)) {
            session.questions.push(createForm(session, question, answers, ++total));
        } else if (incorrectQuestionOrAnswer(question, answers)) {
            await warnUser(session);
            return;
        }
    }
    await client.updateTextItem({
        itemId: formEvt.itemId,
        form: {
            id: formEvt.form.id,
            controls: {
                type: 'LABEL',
                text: 'Quiz submitted.'
            }
        }
    });
    if (!session.questions.length) {
        deleteSession(session.sessionId);
        await client.addTextItem(session.moderatorConvId , {
            parentId: formEvt.itemId,
            content: `There aren't enough questions to make a quiz.`
        });
        return;
    }
    session.sessionOnGoing = true;
    await client.addTextItem(session.moderatorConvId , {
        parentId: formEvt.itemId,
        content: 'Form submitted, will start session.'
    });
    const initialPost = await client.addTextItem(session.quizConvId , {
        subject: title.value ? title.value : `Trivia session ${new Date().toLocaleDateString()}`,
        content: `I will post ${session.questions.length} question${session.questions.length > 1 ? 's' : ''}. You have ${TIME_DELAY} seconds to answer each question. First person to answer correctly gets extra points. Get ready, first question is coming up now...`
    });
    await sleep(TIME_DELAY / 2);
    for (const question of session.questions) {
        formId = question.id;
        session.quizForm = await client.addTextItem(session.quizConvId, {
            parentId: initialPost.itemId,
            form: question
        });
        await sleep(TIME_DELAY);
        await updateForm(session);
    }
    await chooseWinners(session, initialPost.itemId);
    deleteSession(session.sessionId); // Resets local variables for a new session
}

// Find the quiz session for when users submit an answer, returns undefined if not found
const findQuizSession = (evt) => {
    if (quizSessions[evt.form.id]) {
        return quizSessions[evt.form.id];
    }
    if (quizSessions[evt.form.data[0].value] && !quizSessions[evt.form.data[0].value].sessionOnGoing) {
        return quizSessions[evt.form.data[0].value];
    }
    const id = Object.keys(quizSessions).find(id => quizSessions[id].quizForm && quizSessions[id].quizForm.itemId === evt.itemId);
    return quizSessions[id];
}

// Updated the form after the time is finished
const updateForm = async (session) => {
    const quizAnswers = session.quizAnswers;
    const item = session.quizForm;
    const text = {
        type: 'LABEL',
        text: `The correct answer was: \n${mapAnswerGiven(quizAnswers[item.text.formMetaData.id].answer.index)}. ${quizAnswers[item.text.formMetaData.id].answer.value}`
    };
    item.text.formMetaData.controls = [item.text.formMetaData.controls[0], text];
    await client.updateTextItem({
        itemId: item.itemId,
        form: item.text.formMetaData
    });
}

// Submits the answer, awards points if correct (2 if first)
const submitAnswer = (session, evt) => {
    const participantScoresHashMap = session.participantScoresHashMap;
    const quizAnswers = session.quizAnswers;
    const userId = evt.submitterId;
    const userForm = evt.form;
    const answerGiven = Number(userForm.data[0].value);
    const answerData = {
        answerGiven: mapAnswerGiven(answerGiven),
        pointsGiven: 0,
        question: userForm.id.substring(0, 1)
    };
    // If user hasn't submitted  an answer yet store in hash map and set score to 0
    if (!participantScoresHashMap[userId]) {
        participantScoresHashMap[userId] = {
            score: 0,
            answers: {} //  Used to store the user's answers
        };
    }
    // User submitted the correct answer
    if (answerGiven === quizAnswers[userForm.id].answer.index) {
        if (!quizAnswers[userForm.id].answered) {
            quizAnswers[userForm.id].answered = true;
            participantScoresHashMap[userId].score += 2;
            answerData.pointsGiven = 2;
        } else {
            participantScoresHashMap[userId].score++;
            answerData.pointsGiven = 1;
        }
    }
    participantScoresHashMap[userId].answers[userForm.id.substring(0, 1)] = answerData;
}

const addEventListeners = () => {
    client.addEventListener('mention', async evt => {
        const itemReference = evt.mention && evt.mention.itemReference;
        const item = await client.getItemById(itemReference.itemId);
        if (item.text.content.includes('new session')) {
            promptForConversation(item);
        }
    });

    client.addEventListener('formSubmission', async evt => {
        const form = evt.form;
        const quizSession = findQuizSession(evt);
        const conversationsPrompt = conversationsPromptHashMap[form.id];

        // Handle the form submissions for prompting user for conversation to perform quiz in
        if (conversationsPrompt && evt.submitterId !== bot.userId) {
            const convId = form.data[0].value;
            const numberOfQuestions = Number(form.data[1].value) || DEFAULT_NUMBER_OF_QUESTIONS;
            if (!!quizSession) {
                await client.updateTextItem({
                    itemId: evt.itemId,
                    form: {
                        id: form.id,
                        controls: {
                            type: 'LABEL',
                            text: `There appears to be a session underway for ${convId}. Please wait until that session is over before starting another one.`
                        }
                    }
                });
                return;
            }
            try {
                // If someone else tries to use the form to create a conversation return
                if (evt.submitterId !== conversationsPrompt.creatorId) {
                    return;
                }
                // Get conversation by its Id to check if the bot is a part of the conversation, will fail if bot is not included.
                await client.getConversationById(convId);
                console.log(`Sending user ${conversationsPrompt.creatorId} blank form for conversation: ${convId}...`);
                await client.updateTextItem({
                    itemId: evt.itemId,
                    form: {
                        id: form.id,
                        controls: {
                            type: 'LABEL',
                            text: `Creating session for conversation with conversation Id: ${convId}.`
                        }
                    }
                });
                await createBlankForm(conversationsPrompt, convId, numberOfQuestions);
            } catch (err) {
                console.error(err);
                delete conversationsPrompt[form.id];
                let text;
                if (err.code === Circuit.Constants.ErrorCode.PERMISSION_DENIED) {
                    text = `There was an error, please make sure the bot is added to the conversation with conversation Id: ${convId} first. Please add ${bot.emailAddress} to the conversation and try again.`;
                } else {
                    text = `There was an error starting a session for conversation with conversation Id: ${convId}. Please try again later.`
                }
                const content = {
                    itemId: evt.itemId,
                    form: {
                        id: form.id,
                        controls: {
                            type: 'LABEL',
                            text: text
                        }
                    }
                };
                await client.updateTextItem(content);
            }
        }

        // Handle form submissions for the quiz
        if (quizSession) {
            // If the quiz hasn't started and the creator is posting the form, start the new session
            if (!quizSession.sessionOnGoing && quizSession.creatorId === evt.submitterId) {
                createNewSession(evt);
                return;
            } 
            // Only submit answers if the session is ongoing
            if (quizSession.sessionOnGoing) {
                submitAnswer(quizSession, evt);
            }
        }
    });
}


// Return true if the uqestion is filled out correctly
const isValidQuestion = (question, answers) => {
    return !!question.value.length && answers.every(answer => !!answer.value.length);
}

// Return true if the uqestion is filled out correctly
const incorrectQuestionOrAnswer = (question, answers) => {
    return (!!question.value.length && answers.some(answer => !answer.value.length)
        || (!question.value.length && answers.some(answer => !!answer.value.length)))
        || question.value.length > CHARACTER_LIMIT
        || answers.some(answer => answer.value.length > CHARACTER_LIMIT);
}

const warnUser = async (session) => {
    try {
        await client.addTextItem(session.form.convId, {
            parentId: session.form.parentItemId || session.form.itemId,
            content: 'One of the questions seem to be filled out improperly. Please create a new session and fix the issue.'
        });
        deleteSession(session.sessionId);
    } catch (err) {
        deleteSession(session.sessionId);
        console.error(err);
    }
}

// Map the index of answer given to the corresponding letter value for results
const mapAnswerGiven = (index) => {
    switch (index) {
        case 0 : 
            return 'A';
        case 1: 
            return 'B';
        case 2: 
            return 'C';
        case 3: 
            return 'D';
    }
}

// Delete the session from the Cache / Hash Map
const deleteSession = (id) => {
    if (quizSessions[id]) {
        delete quizSessions[id];
    }
}

// Delay process in seconds
const sleep = (seconds) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Start the bot as soon as script is run
(async () => {
    try {
        bot = await client.logon();
        addEventListeners();
    } catch (err) {
        console.error(err);
    }
})();