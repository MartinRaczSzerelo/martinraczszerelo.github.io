var titlepage = document.querySelector("#titlepage");
var main = document.querySelector("#main");
var zoe = document.querySelector("#zoe");
var zoeDialogue = document.querySelector("#zoe-dialogue");
var playerDialogue = document.querySelector("#player-dialogue");
var choices = document.querySelector("#choices");
var pointsCounter = document.querySelector("#points > span");
var letters = document.querySelectorAll("#letters > span");
var winMessage = document.querySelector("#win");

var firstPlaythrough = true;
var needToSelectNothing = false; // flag to select "NOTHING" at the right time

var points = 0; // hearts
var availableLetters = {}; // bought letters
var gotPointsFromLines = {}; // lines that have already scored points (and can't again)

var dialogueRunning = false;
var playerTalking = true; // true if the player is talking, false if it's Zoe
var zoeTalking = false; // This one's for if her mouth is open or not
var expression = "";

// Show line character-by-character
var textRunning = false;
var currentLine = "";
var currentLineIndex = 0;
var dialogueElement = null;

function init() {
	playerDialogue.style.display = "none";
	zoeDialogue.style.display = "none";
	
	document.onclick = closeTitle;
	start();
	fadeInStartHint();

	// Uncomment for testing
	//selectLetters("ABCDEFGHIJKLMNOPQRSTUVW");
}

function start() {
	story = new inkjs.Story(storyContent);
	
	expression = "happy";
	setZoeBG(false);
}

function fadeInStartHint() {
	setTimeout(() => {
		var start = document.querySelector("#start");
		start.style.opacity = "1";
	}, 3000);
}

function closeTitle() {
	titlepage.style.display = "none";
	main.style.display = "block";
	document.onclick = null;

	// Brief delay before first dialogue appears
	setTimeout(() => {
		dialogueRunning = true;
		document.onclick = clicked;
		getNext();
	}, 500);
}

function clicked() {
	if (dialogueRunning) {
		if (textRunning) {
			stopRunningText();
			if (needToSelectNothing) {
				// If they skipped through spelling out NOTHING, select it now
				selectLetters("NOTHING");
				needToSelectNothing = false;
			}
		}
		else {
			getNext();
		}
	}
}


////////////////////// Ink //////////////////////////

function getNext() {
	
	// New line of dialogue
	if (story.canContinue){
		
		var line = story.Continue();
		var tags = story.currentTags;
		
		// Reset line-by-line things
		zoeDialogue.classList.remove("heart");
		var scoring = false;
		
		// Tags
		for (var i=0; i<tags.length; i++) {
			var tag = tags[i];

			// Lines that depend on if this is the first playthrough
			if (tag == "first" && !firstPlaythrough) {
				getNext();
				return;
			}
			else if (tag == "not-first" && firstPlaythrough) {
				getNext();
				return;
			}
			// Special display for "I have NOTHING to say"
			else if (tag == "nothing"){
				line = line.replace("<b>nothing</b>",
					"<span class='nothing'>N</span> <span class='nothing'>O</span> <span class='nothing'>T</span> <span class='nothing'>H</span> <span class='nothing'>I</span> <span class='nothing'>N</span> <span class='nothing'>G</span>");
				needToSelectNothing = true;
			}
			// Inform Ink of the "real" points at the end
			else if (tag == "getRealPoints"){
				setRealPoints();
			}
			// Successful confession = you can keep playing
			else if (tag == "win"){
				win();
				return;
			}
			// Check for points (pts:1)
			else if (tag.includes("pts:")) {
				scoring = true;
				var n = tag.substr(4);
				getPoints(n, line);
			}
			// Player lines
			else if (tag == "me" || tag == "zoe") {
				toggleSpeaker(tag);
			}
			// Else the tag is the expression
			else {
				// because of the ~pts function in Ink, we can assume the pts tag came before the expression tag, so we know if this line scores points
				setExpression(tag, scoring);
			}
		}
		
		// Write line
		showDialogue(line);
	}
	
	// Choices
	else if (story.currentChoices.length > 0) {
		getChoices();
	}
	
	else {
		end();
	}
}

function getChoices() {
	
	dialogueRunning = false;
	
	story.currentChoices.forEach(function(choice) {
		
		var available = true;
		
		// Test the letters to make sure we have them
		var inner = choice.text;
		for (var i=inner.length - 1; i>=0; i--) { // Go backwards to easily add spans
			var letter = inner[i].toUpperCase();
			if (letter.match(/^[A-Z]+$/i) !== null && 	// Only check letters, not punctuation
					!(letter in availableLetters)) { 	// See if it's on the available list
				available = false;
				inner = inner.substr(0,i) + "<span class='missing'>" + inner[i] + "</span>" + inner.substr(i+1);
			}
		}
		
		// Create choice
		var choiceElement = document.createElement('div');
		if (available) {
			choiceElement.classList.add("available");
		}
		choiceElement.innerHTML = inner;
		choices.appendChild(choiceElement);
		
		// Click event listener
		if (available) {
			choiceElement.addEventListener("click", function(event) {
				
				// Choose
				story.ChooseChoiceIndex(choice.index);
				
				// Remove choices
				choices.innerHTML = "";
				
				// Continue
				story.Continue(); // by default Ink prints the choice, just skip it
				getNext();

				// Prevent this click from propogating and advancing the dialogue
				event.stopImmediatePropagation();
				dialogueRunning = true;
				
			});
		}
		// Hover listener to highlight missing letters
		else {
			choiceElement.addEventListener("mouseover", function(event) {
				highlightMissing(choiceElement);
			});
			choiceElement.addEventListener("mouseout", function(event) {
				removeHighlight();
			});
		}
	});
}

function end() {
	dialogueRunning = false;
	if (Object.keys(availableLetters).length < 26) {
		startBuying();
	}
	else {
		skipBuying();
	}
}

function skipBuying() {
	zoe.style.display = "none";
	playerDialogue.style.display = "none";
	choices.innerHTML = "<div class='available' onclick='restart()'>Play Again</div>";
}

function restart() {
	stopBuying();
	choices.innerHTML = "";
	winMessage.style.display = "none";

	firstPlaythrough = false;
	start();
	dialogueRunning = true;
}

function win() {
	// Keep the dialogue and show The End and an option to play more
	dialogueRunning = false;
	choices.innerHTML = "<div id='win-restart' class='available' onclick='restart()'>Play Again?</div>";
	winMessage.style.display = "block";
}

/////////////////////////// Display //////////////////////

function toggleSpeaker(tag) {
	if (tag == "me"){
		playerTalking = true;
		playerDialogue.style.display = "block";
		zoeDialogue.style.display = "none";
		setZoeBG(false);
	}
	else {
		playerTalking = false;
		zoeDialogue.style.display = "block";
		playerDialogue.style.display = "none";
	}
}

function setExpression(tag, scoring) {
	switch (tag) {
		case ":D":
			expression = scoring ? "blush" : "happiest";
			break;
		case ":*":
			expression = "blush";
			break;
		case ":|":
			expression = "disappointed";
			break;
		case ">:\\":
			expression = "mad";
			break;
		default:
			expression = "happy";
	}
	setZoeBG(false);
}

function setZoeBG(talking) {
	zoeTalking = talking;
	
	var talk = "";
	if (talking && !playerTalking) {
		talk = "_talk";
	}
	zoe.style.backgroundImage = "url('images/zoe_" + expression + talk + ".png')";
}

function showDialogue(line) {
	dialogueElement = playerTalking? playerDialogue : zoeDialogue;
	currentLine = line;
	currentLineIndex = 0;

	textRunning = true;
	if (line.trim() != "...") {
		setZoeBG(true);
	}
	dialogueElement.innerHTML = "";

	addCharacter();
}

// Updates displayed text to add a character, then calls itself
function addCharacter(){
	var delay = 30;

	// Stop
	if (!textRunning || currentLineIndex == currentLine.length) {
		stopRunningText();
		return;
	}
	
	// Move Zoe's mouth
	var test = currentLineIndex % 5;
	if (test == 0) {
		if (currentLine.trim() != "...") {
			setZoeBG(!zoeTalking);
		}
	}

	// Handle markup (probably could be done better?)
	if (currentLineIndex > 0 && currentLine[currentLineIndex] == "<") {
		if (currentLine.substr(currentLineIndex, 4) == "<br>") {
			currentLineIndex += 4;
		}
		// Select the letters of NOTHING when displaying them
		else if (currentLine.substr(currentLineIndex, 22) == "<span class='nothing'>"){
			var letter = currentLine[currentLineIndex + 22];
			selectLetter(letter);
			currentLineIndex += 30;
			delay = 200;
		}
	}

	// Add bg class to hide the remainder of the line
	var newLine = currentLine.substr(0, currentLineIndex) +
		"<span class='bg'>" +
		currentLine.substr(currentLineIndex) +
		"</span>";
	dialogueElement.innerHTML = newLine;
	
	// Call again after delay
	currentLineIndex++;
	setTimeout(function() {
		addCharacter();
	}, delay);
}

function stopRunningText(){
	dialogueElement.innerHTML = currentLine;
	textRunning = false;
	setZoeBG(false);
}


////////////////////////// Letters/Buying //////////////////////

function selectLetter(letter){
	availableLetters[letter] = letter;
	document.querySelector("#"+letter).classList.add("selected");
}

function selectLetters(letters) {
	// Select multiple letters - for testing purposes
	for (let letter of letters) {
		selectLetter(letter);
	}
}

function highlightMissing(choiceElement){
	var missingLetters = choiceElement.querySelectorAll(".missing");
	for (var i=0; i < missingLetters.length; i++){
		var letter = missingLetters[i].innerHTML.toUpperCase();
		var letterElement = document.querySelector("#"+letter);
		letterElement.classList.add("missing");
	}
}

function removeHighlight(){
	for (var i=0; i < letters.length; i++){
		letters[i].classList.remove("missing");
	}
}

function getPoints(n, line) {
	// Repeat points are worth 1 but can be scored multiple times
	var repeat = false;
	if (n == "repeat") {
		repeat = true;
		n = 1;
	}
	// Only get points if we haven't already gotten points off this line
	if (repeat || !(line in gotPointsFromLines)) {
		gotPointsFromLines[line] = n;
		points += parseInt(n);
		pointsCounter.innerHTML = points;
		zoeDialogue.classList.add("heart");
	}
}

function setRealPoints() {
	// Passes the real (not already gotten) points into Ink
	story.variablesState["realpts"] = points;
}

function startBuying() {
	zoe.style.display = "none";
	playerDialogue.style.display = "none";
	main.classList.add("buying");
	
	choices.innerHTML = "<div style='text-align:left'>Click letters to unlock them. Each costs a heart.</div><div class='available' onclick='restart()'>Play Again</div>";
	
	if (points == 0) {
		var message = document.querySelector("#choices div");
		message.innerHTML = "<b>No hearts!</b> Play again and earn some to unlock letters.";
	}
	else {
		for (var i=0; i<letters.length; i++){
			var letter = letters[i];
			if (!letter.classList.contains("selected")) {
				toggleBuyLetter(letter, true);
			}
		}
	}
}

function stopBuying() {
	zoe.style.display = "block";
	main.classList.remove("buying");
	setAllUnbuyable();
}

function setAllUnbuyable(){
	for (var i=0; i<letters.length; i++){
		var letter = letters[i];
		toggleBuyLetter(letter, false);
	}
}

function toggleBuyLetter(letter, buying){
	if (buying) {
		letter.classList.add("buyable");
		letter.addEventListener("click", buyLetter);
	}
	else {
		letter.classList.remove("buyable");
		letter.removeEventListener("click", buyLetter);
	}
}

function buyLetter(event) {
	var letter = event.target;
	spendPoint();
	selectLetter(letter.innerHTML);
	toggleBuyLetter(letter, false);
}

function spendPoint(){
	points--;
	pointsCounter.innerHTML = points;
	
	if (points <= 0) {
		var message = document.querySelector("#choices div");
		message.remove();
	
		setAllUnbuyable();
	}
}

/////////////////////////////

init();