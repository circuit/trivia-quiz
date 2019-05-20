const Circuit = require('circuit-sdk');
const config = require('./config.json');

const client = new Circuit.Client(config.credentials);

const MODERATOR_CONVERSATION_ID = config.moderatorConversationId; // conversation Id of the covnersation with moderator
const QUIZ_CONVERSATION_ID = config.quizConversationId; // conversation Id of the trivia quiz
const TIME_DELAY = 10; // Delay to wait between questions
let FORM_ID; // Id of the current form (Creation Form or Questions for Trivia)
let CREATOR_ID; // User Id of the moderator
let quizForm; // Item Object of the current form
let sessionOnGoing = false; // to determine if a session is going on
let participantScoresHashMap = {}; // Hash map for participant scores, indexed by userId
let quizAnswers = {}; // Hash map of quiz answers, indexed by their form id
let bot; // Bot to manage the trivia session

// Create the blank form for the moderator to fill out
const createBlankForm = async (item) => {
    CREATOR_ID = item.creatorId;
    FORM_ID = `${Date.now()}_${Math.random()}`;
    let controls = [{
        type: 'INPUT',
        name: `title`, // optional
        text: 'Enter an optional title',
    }];
    for (let i = 1; i <= 10; i++) {
        const question = [{
            type: 'LABEL',
            text: `Question ${i}`
        },{
            type: 'INPUT',
            name: `question${i}`,
            text: 'Enter the question here...',
        }, {
            type: 'LABEL',
            text: `Answer to question ${i}`
        },{
            type: 'INPUT',
            name: `answer${i}`,
            text: 'Enter the answer here...',
        }];
        controls = [...controls, ...question];
    }
    const actionButtons = [{
        type: 'BUTTON', // submit the form
        options: [{
            text: 'Start session now',
            action: 'submit',
            notification: 'Form submitted successfully'
        },{
        text: 'Cancel',
        action: 'reset',
        notification: 'Form cancelled successfully'
        }]
    }];
    controls = [...controls, ...actionButtons];
    const form = {
        title: 'Trivia Quiz', // optional
        id: FORM_ID,
        controls: controls
    }
    const content = {
        content: 'Trivia Quiz',
        form: form
    }
    quizForm = await client.addTextItem(MODERATOR_CONVERSATION_ID, content);
}

// Creates a form for each question
const createForm = (question, answer, total) => {
    const formId = `${Date.now()}_${Math.random()}`;
    // Save questions an answers in a hash map for later
    quizAnswers[formId] = {
        answer: answer.value,
        question: question.value
    };
    const form = {
        title: `Question ${total}`,
        id: formId,
        controls: [{
            type: 'LABEL',
            text: question.value
        }, {
            type: 'INPUT',
            name: `answer`,
            text: 'Enter your answer here',
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
const chooseWinners = async (itemId) => {
    await sleep(TIME_DELAY);
    await client.addTextItem(QUIZ_CONVERSATION_ID , {
        parentId: itemId,
        content: 'And the winners are...'
    });
    await sleep(TIME_DELAY / 2);
    const participants = Object.keys(participantScoresHashMap).map(userId => {
        return { userId: userId, score: participantScoresHashMap[userId].score };
    });
    // Sort particpants based on their scores to choose winner
    participants.sort((a,b) => a.score > b.score ? -1 : 1);
    const winnersScores = participants.slice(0 , 3);
    const winnerUserIds = winnersScores.map(w => w.userId);
    const winners = !!winnerUserIds.length && await client.getUsersById(winnerUserIds);
    const nonPositiveScores = winnersScores.every(s => s.score < 1);
    let content = !winners || nonPositiveScores ? 'Sorry there were no winners.' : 'Winners:\n\n';
    !nonPositiveScores && winnersScores.forEach((w, i) => {
        const win = winners.find(u => u.userId === w.userId);
        const winnerText = `${i + 1}. ${win.displayName} - ${w.score} points.\n`;
        content += winnerText;
    });
    await client.addTextItem(QUIZ_CONVERSATION_ID , {
        parentId: itemId,
        content: content
    });
}

// Created a new session from the form and runs the quiz
const createNewSession = async (formEvt) => {
    const form = formEvt.form;
    const questions = []; // An array of form questions
    const title = form.data[0];
    let total = 0;
    for (let i = 1; i < form.data.length; i += 2) {
        const question = form.data[i];
        const answer = form.data[i + 1];
        if (question.value.length && answer.value.length) {
            questions.push(createForm(question, answer, ++total));
        }
    }
    if (!questions.length) {
        await client.addTextItem(MODERATOR_CONVERSATION_ID , {
            parentId: formEvt.itemId,
            content: `There aren't enough questions to make a quiz`
        });
        return;
    }
    sessionOnGoing = true;
    await client.addTextItem(MODERATOR_CONVERSATION_ID , {
        parentId: formEvt.itemId,
        content: 'Form submitted, will start session.'
    });
    const initialPost = await client.addTextItem(QUIZ_CONVERSATION_ID , {
        subject: title.value ? title.value : `Trivia session ${new Date().toLocaleDateString()}`,
        content: `I will post ${questions.length} questions. You have 10 seconds to answer each question. First person to answer correctly gets extra points. Get ready, first question is coming up now...`
    });
    await sleep(TIME_DELAY);
    for (const question of questions) {
        FORM_ID = question.id;
        quizForm = await client.addTextItem(QUIZ_CONVERSATION_ID, {
            parentId: initialPost.itemId,
            form: question
        });
        await sleep(TIME_DELAY);
        await updateForm(quizForm);
    }
    await chooseWinners(initialPost.itemId);
    endSession(); // Resets local variables for a new session
}

// Updated the form after the time is finished
const updateForm = async (item) => {
    const text = {
        type: 'LABEL',
        text: `The correct answer was: ${quizAnswers[item.text.formMetaData.id].answer}`
    };
    item.text.formMetaData.controls = [item.text.formMetaData.controls[0], text];
    await client.updateTextItem({
        itemId: item.itemId,
        form: item.text.formMetaData
    });
}

// Submits the answer, awards points if correct (2 if first)
const submitAnswer = (evt) => {
    const userId = evt.submitterId;
    const userForm = evt.form;
    // If user hasn't submitted  an answer yet store in hash map and set score to 0
    if (!participantScoresHashMap[userId]) {
        participantScoresHashMap[userId] = {
            score: 0
        };
    }
    // User submitted the correct answer
    if (userForm.data[0].value === quizAnswers[userForm.id].answer) {
        if (!quizAnswers[userForm.id].answered) {
            quizAnswers[userForm.id].answered = true;
            participantScoresHashMap[userId].score += 2;
        } else {
            participantScoresHashMap[userId].score++;
        }
    }
}

// Reset variables for the session
const endSession = () => {
    FORM_ID = null;
    CREATOR_ID = null;
    quizForm = null;
    sessionOnGoing = false;
    participantScoresHashMap = {};
    quizAnswers = {};
}

const addEventListeners = () => {
    client.addEventListener('itemAdded', evt => {
        const item = evt && evt.item;
        // The item was posted in the moderator conversation
        if (item.convId === MODERATOR_CONVERSATION_ID) {
            const createNewSession = item.text.mentionedUsers && item.text.mentionedUsers.includes(bot.userId) && item.text.content.includes('new session');
            // If the item contains a form and not from the bot itself, create a bank form for the moderator
            if (!item.text.formMetaData && item.creatorId !== bot.userId && createNewSession) {
                createBlankForm(item);
            }
        }
    });

    client.addEventListener('formSubmission', async evt => {
        if (quizForm.itemId === evt.itemId && evt.submitterId !== bot.userId) {
           if (evt.form.id !== FORM_ID) {
                return;
           }
           // Return so the creator cannot take part in the quiz 
           if (evt.submitterId === CREATOR_ID) {
               // If the moderator submits the form from the moderator conversation, create a new session
               if (!sessionOnGoing && evt.itemId === quizForm.itemId && quizForm.convId === MODERATOR_CONVERSATION_ID) {
                    createNewSession(evt);
               }
           } else {
                submitAnswer(evt);
           }

        }
    });
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