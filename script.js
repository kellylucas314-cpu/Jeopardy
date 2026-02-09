// Game data
const questions = [
    // Category 0: 90s Throwbacks
    [
        { question: "This Nickelodeon show featured a football-headed kid and his best friend Gerald", answer: ["hey arnold", "arnold"] },
        { question: "This handheld digital pet required constant feeding or it would die", answer: ["tamagotchi"] },
        { question: "This phrase became iconic after Alicia Silverstone said it in 'Clueless'", answer: ["as if", "asif"] },
        { question: "This boy band had hits like 'I Want It That Way' and 'Everybody'", answer: ["backstreet boys", "bsb"] },
        { question: "This show about 6 friends in NYC ran from 1994-2004", answer: ["friends"] }
    ],
    // Category 1: Wild Science
    [
        { question: "This is the only planet in our solar system that rotates on its side", answer: ["uranus"] },
        { question: "This element is the most abundant in the human body", answer: ["oxygen", "o"] },
        { question: "Light takes this many minutes to travel from the Sun to Earth", answer: ["8", "eight", "8 minutes"] },
        { question: "This animal has three hearts", answer: ["octopus"] },
        { question: "This phenomenon causes water to spiral down drains in different directions based on hemisphere", answer: ["coriolis effect", "coriolis"] }
    ],
    // Category 2: Animal Kingdom
    [
        { question: "This is the fastest land animal on Earth", answer: ["cheetah"] },
        { question: "This sea creature has been known to live for over 200 years", answer: ["tortoise", "turtle", "galapagos tortoise"] },
        { question: "A group of crows is called this", answer: ["murder", "a murder"] },
        { question: "This mammal has the most powerful bite force", answer: ["hippo", "hippopotamus"] },
        { question: "This bird can fly backwards", answer: ["hummingbird"] }
    ],
    // Category 3: Movie Quotes
    [
        { question: "'You can't handle the truth!' - This 1992 courtroom drama", answer: ["a few good men", "few good men"] },
        { question: "'I see dead people' - This 1999 supernatural thriller", answer: ["the sixth sense", "sixth sense"] },
        { question: "'May the Force be with you' - This 1977 space epic", answer: ["star wars"] },
        { question: "'Here's looking at you, kid' - This 1942 romance in Morocco", answer: ["casablanca"] },
        { question: "'You're gonna need a bigger boat' - This 1975 shark thriller", answer: ["jaws"] }
    ],
    // Category 4: Food & Drink
    [
        { question: "This Italian cheese is traditionally used on Caesar salad", answer: ["parmesan", "parmigiano", "parmigiano reggiano"] },
        { question: "This is the main ingredient in guacamole", answer: ["avocado", "avocados"] },
        { question: "This Asian country is the largest producer of rice", answer: ["china"] },
        { question: "This cocktail consists of tequila, lime juice, and orange liqueur", answer: ["margarita"] },
        { question: "This fruit is technically a berry, but grapes and bananas are not", answer: ["watermelon", "strawberry"] }
    ]
];

let score = 0;
let currentClue = null;

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    const clues = document.querySelectorAll('.clue');
    const modal = document.getElementById('modal');
    const submitBtn = document.getElementById('submitBtn');
    const closeBtn = document.getElementById('closeBtn');
    const answerInput = document.getElementById('answerInput');

    clues.forEach(clue => {
        clue.addEventListener('click', function() {
            if (this.classList.contains('answered')) return;
            
            const category = parseInt(this.dataset.category);
            const questionIndex = parseInt(this.dataset.question);
            const value = parseInt(this.dataset.value);
            
            currentClue = {
                element: this,
                category: category,
                questionIndex: questionIndex,
                value: value,
                data: questions[category][questionIndex]
            };
            
            showModal();
        });
    });

    submitBtn.addEventListener('click', checkAnswer);
    closeBtn.addEventListener('click', closeModal);
    
    answerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
});

function showModal() {
    const modal = document.getElementById('modal');
    const modalValue = document.getElementById('modalValue');
    const modalQuestion = document.getElementById('modalQuestion');
    const answerInput = document.getElementById('answerInput');
    const feedback = document.getElementById('feedback');
    
    modalValue.textContent = '$' + currentClue.value;
    modalQuestion.textContent = currentClue.data.question;
    answerInput.value = '';
    feedback.textContent = '';
    feedback.className = '';
    
    modal.style.display = 'block';
    answerInput.focus();
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    currentClue = null;
}

function checkAnswer() {
    const answerInput = document.getElementById('answerInput');
    const feedback = document.getElementById('feedback');
    const userAnswer = answerInput.value.trim().toLowerCase();
    
    if (!userAnswer) {
        feedback.textContent = 'Please enter an answer!';
        feedback.className = 'incorrect';
        return;
    }
    
    const correctAnswers = currentClue.data.answer;
    const isCorrect = correctAnswers.some(answer => 
        userAnswer.includes(answer.toLowerCase()) || 
        answer.toLowerCase().includes(userAnswer)
    );
    
    if (isCorrect) {
        score += currentClue.value;
        updateScore();
        feedback.textContent = '✓ Correct! +$' + currentClue.value;
        feedback.className = 'correct';
        currentClue.element.classList.add('answered');
        
        setTimeout(() => {
            closeModal();
        }, 1500);
    } else {
        feedback.textContent = '✗ Incorrect! The answer was: ' + correctAnswers[0];
        feedback.className = 'incorrect';
        currentClue.element.classList.add('answered');
        
        setTimeout(() => {
            closeModal();
        }, 3000);
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
}
