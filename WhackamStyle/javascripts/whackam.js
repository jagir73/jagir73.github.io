// ****************************************************************************
//                               Whackam Style
//                       Jasmin Giroux & Jonathan Lacasse
// ****************************************************************************
// Assets
var PATH_MOLE = './images/psy.png';
var MOLE_WIDTH = 123;
var MOLE_HEIGHT = 229;
var PATH_SPAWNPOINT = './images/spawnpoint.png';
var SPAWNPOINT_WIDTH = 256;
var SPAWNPOINT_HEIGHT = 256;
var PATH_BUTTON = './images/button.png';
var BUTTON_WIDTH = 252;
var BUTTON_HEIGHT = 50;
var PATH_BACKGROUND = './images/background.png';

// Settings
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var FPS = 30;
var DELAY_FRAME = 3;
var DELAY_SEND = 10 * FPS;
var DELAY_SHOW = 2 * FPS;
var REPOP_VALUE = 60;
var DEPOP_VALUE = 45;
var POINTS_PER_HIT = 1000;
var COUNTDOWN_VALUE = 3 * FPS;
var MENU_BUTTONS = 2;
var LOSE_BUTTONS = 2;
var LEADERBOARD_BUTTONS = 4;
var DIFFICULTY = 1000; //The higher the number is the slower it gets difficult.

var points = 0;
var gameStarted = false;
var countDown = 0;
var inLeaderboard = false;
var curBoardPage = 0;

var lose = false;
var submittingScore = false;
var submitError = false;

//Array of spawn points.
var spawnPoints = [];

// The leaderboard
var curLeaderboardDelay = 0;
function submitCallback(response) {
	leaderboard.working = false;
	leaderboard.success = response.Success;
	
	if (leaderboard.success)
	{
		submitError = false;
		submittingScore = false;
		gameStarted = false;
		inLeaderboard = true;
		points = 0;				
		usernameElement.css('display', 'none');
		leaderboard.show();
	}
}
function listCallback(scores, numscores, response) {
	leaderboard.working = false;
	leaderboard.scores = scores;
	leaderboard.numScores = numscores;
	leaderboard.success = response.Success;
}

var leaderboard = new Leaderboard(submitCallback, listCallback);

//Add the canvas element to the body.
var canvasElement = $('<canvas style="padding-left: 0;padding-right: 0;margin-left: auto;margin-right: auto; display: block;" id="canvas" width="' + CANVAS_WIDTH + 
          '" height="' + CANVAS_HEIGHT + '">This text is displayed if your browser does not support HTML5 Canvas.</canvas>');
var canvas = canvasElement.get(0).getContext("2d");
canvasElement.appendTo('#content');

//Add the textbox item to the body.
var usernameElement = $('<input type="text" />');
usernameElement.css('position', 'absolute');
usernameElement.css('top', '345px');
usernameElement.css('left', '950px');
usernameElement.css('display', 'none');
usernameElement.appendTo('#content');
	
// Constructor for Shape objects to hold data for all drawn objects.
function Shape(image, x, y, w, h, nbFrames) {
  this.image = image || new Image();
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 0;
  this.h = h || 0;
  this.nbFrames = nbFrames || 0;
  this.curFrame = 0;
  this.frameDelay = 0;
  this.invisible = true;
  this.repop = addTime(REPOP_VALUE);
  this.depop = addTime(DEPOP_VALUE);
  this.spawnPoint = 0;
}

// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  ctx.drawImage(this.image, this.curFrame * this.w, 0, this.w, this.h, this.x, this.y, this.w, this.h);
  if (++this.frameDelay > DELAY_FRAME)
  {
	if (++this.curFrame > this.nbFrames)
	  this.curFrame = 0;
	this.frameDelay = 0;
  }
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Height) and its Y and (Y + Height)
  return  (this.x <= mx) && (this.x + this.w >= mx) &&
          (this.y <= my) && (this.y + this.h >= my);
}

// SpawnPoints Constructor
function SpawnPoint(image, x, y, w, h) 
{
  this.image = image || new Image();
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 0;
  this.h = h || 0;
  this.occupied = false;
}

// Draws this SpawnPoint to a given context
SpawnPoint.prototype.draw = function(ctx) {
  ctx.drawImage(this.image, this.x, this.y);
}

function CanvasState(canvas) {
  // ** Setup **
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  // Fixes mouse coordinates
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // The collection of things to be drawn
  this.moles = [];
  this.buttons = [];
  this.background;
  
  // ** Events **
  var myState = this;
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  
  canvas.addEventListener('mousedown', function(e) 
  {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var moles = myState.moles;
	var buttons = myState.buttons;
    var l = moles.length;
	
	if(!gameStarted)
	{
		if (!inLeaderboard)
		{
			// MENU
			if(buttons[0].contains(mx,my))
			{
				// START GAME
				// Log play to Playtomic
				Playtomic.Log.Play();
				
				//Clean the spawn points.
				for(var i = 0; i < spawnPoints.length; i++)
				{
					spawnPoints[i].occupied = false;
				}
			
				//Clean the moles.
				for(var i = 0; i < l; i++)
				{
				  moles[i].invisible = true;
				  moles[i].repop = addTime(REPOP_VALUE);
				  moles[i].depop = addTime(DEPOP_VALUE);
				}
				
				lose = false;
				gameStarted = true;
				countDown = COUNTDOWN_VALUE;
				curLeaderboardDelay = 0;
				leaderboard.clear();
				return;
			}
			else if(buttons[1].contains(mx,my))
			{
				inLeaderboard = true;
				curLeaderboardDelay = 0;
				leaderboard.show();
				return;
			}
		} else {
			// LEADERBOARD
			if(buttons[4].contains(mx,my))
			{
				// Prev
				curLeaderboardDelay = 0;
				leaderboard.showPrev();
				return;
			}
			else if(buttons[5].contains(mx,my))
			{
				// MENU
				curLeaderboardDelay = 0;
				leaderboard.clear();
				inLeaderboard = false;
				return;
			}
			else if(buttons[6].contains(mx,my))
			{
				// NEXT
				curLeaderboardDelay = 0;
				leaderboard.showNext();
				return;
			}
			else if(buttons[7].contains(mx,my))
			{
				// REFRESH
				curLeaderboardDelay = 0;
				leaderboard.refresh();
				return;
			}
		}
	} else if (lose){
		// GAME OVER
		if(buttons[2].contains(mx,my))
		{
			// SKIP
			submitError = false;
			submittingScore = false;
			gameStarted = false;
			inLeaderboard = true;
			points = 0;
			usernameElement.css('display', 'none');
			curLeaderboardDelay = 0;
			leaderboard.show();
			return;
		}
		else if(buttons[3].contains(mx,my))
		{
			// SUBMIT
			if (!submittingScore) {
				var username = $.trim(usernameElement.val());
				if (username != '')
				{
					submittingScore = true;
					curLeaderboardDelay = 0;
					leaderboard.submit(username, points);
				} else {
					submitError = true;
					submittingScore = false;
				}
				return;
			}
		}
	}
	
    for (var i = 0; i < l; i++) 
	{
		if(moles[i].invisible)
			continue;
	
      if (moles[i].contains(mx, my)) 
	  {
        moles[i].repop = addTime(REPOP_VALUE);
        moles[i].depop = addTime(DEPOP_VALUE);
		spawnPoints[moles[i].spawnPoint].occupied = false;
		moles[i].spawnPoint = -1;
		moles[i].invisible = true;
		Sound.play("op");
		points += POINTS_PER_HIT;
        return;
      }
    }
  }, true);
  
  // ** Settings **
  this.interval = FPS;
  setInterval(function() { myState.draw(); }, 1000/myState.interval);
}

CanvasState.prototype.addMole = function(shape) {
  this.moles.push(shape);
}

CanvasState.prototype.addButton = function(shape) {
  this.buttons.push(shape);
}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

// Draw is called as often as the INTERVAL variable demands
CanvasState.prototype.draw = function() 
{
	var ctx = this.ctx;
	var moles = this.moles;
	var buttons = this.buttons;
	this.clear();
	
	// Background
	this.background.draw(ctx)
	
	if(gameStarted)
	{
		//Whatever condition that makes the game end. Shows a GAME OVER screen for 3 seconds.
		if(lose)
		{
			if (submitError){
				usernameElement.focus();
				ctx.fillStyle = 'red';
				ctx.font = '30px san-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText('To submit your score, you must enter a name.', CANVAS_WIDTH/2, (CANVAS_HEIGHT/4)+85);
			}
			
			if (submittingScore) {
				ctx.font = '25px san-serif';
				if (leaderboard.working) {
				    if (++curLeaderboardDelay > DELAY_SEND) {
						curLeaderboardDelay = 0;
						var username = $.trim(usernameElement.val());
						if (username != '')
						{
							submittingScore = true;
							curLeaderboardDelay = 0;
							leaderboard.submit(username, points);
						} else {
							submitError = true;
							submittingScore = false;
						}
					}
					ctx.fillStyle = 'orange';
					ctx.fillText('Sending...', CANVAS_WIDTH/2, 7 * CANVAS_HEIGHT/10);
				} else if (!leaderboard.success) {
					ctx.fillStyle = 'red';
					ctx.fillText('Something went wrong. Submit again.', CANVAS_WIDTH/2, 8 * CANVAS_HEIGHT/10);
				}
			}
			
			ctx.fillStyle = 'yellow';
			ctx.font = '40px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/4);
			ctx.fillText('Points : ' + points, CANVAS_WIDTH/2, (CANVAS_HEIGHT/4)+40);
			
			ctx.fillText('Name :', CANVAS_WIDTH/3 + 55, (CANVAS_HEIGHT/4)+125);
			usernameElement.css('display', 'inline');
			
			// Draw lose buttons
			for (var i = MENU_BUTTONS; i < MENU_BUTTONS + LOSE_BUTTONS; i++) 
		      buttons[i].draw(ctx);
			
			// Text in buttons
			ctx.fillStyle = 'black';
			ctx.font = '25px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillText('SKIP', CANVAS_WIDTH/4 ,CANVAS_HEIGHT*6/10 + 15);
			ctx.fillText('SUBMIT', 3 * CANVAS_WIDTH/4 ,CANVAS_HEIGHT*6/10 + 15);			
			return;
		}
	
		if(countDown != 0)
		{
			ctx.fillStyle = 'yellow';
			ctx.font = '60px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(Math.ceil(countDown/FPS), CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
			ctx.font = '30px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('Rule : Hit them all until you can\'t keep up.', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 65);
			countDown--;
			return;
		}
		
		for(var i = 0; i < spawnPoints.length; i++)
		{
		  spawnPoints[i].draw(ctx);
		}
		
		// Draw all moles
		var l = moles.length;
		for (var i = 0; i < l; i++) 
		{
		  var shape = moles[i];
		  
		  if (!shape.invisible)
		  {
			shape.depop--;
			if(shape.depop <= 0)
			{
				shape.invisible = true;
				lose = true;
				
				//Clean the spawn points.
				for(var i = 0; i < spawnPoints.length; i++)
				{
					spawnPoints[i].occupied = false;
				}
			
				//Clean the moles.
				for(var i = 0; i < l; i++)
				{
				  moles[i].invisible = true;
				}
				
				// Send analytics
				Playtomic.Log.ForceSend();
				return;
			}
			else
				shape.draw(ctx);
		  }
		  else
		  {
			shape.repop--;
			
			if(shape.repop <= 0)
			{
				shape.spawnPoint = getFreeSpawnPoint(moles[i]);
				shape.invisible = false;
				shape.repop = addTime(REPOP_VALUE);
				shape.draw(ctx);
			}
		  }
		}
		
		// Points
		ctx.fillStyle = 'yellow';
		ctx.font = '20px san-serif';
		ctx.textBaseline = 'bottom';
		ctx.fillText('POINTS : ' + points, CANVAS_WIDTH - 75, 25);
	}
	else
	{
		if (!inLeaderboard)
		{
			// Game Menu Title
			ctx.fillStyle = 'yellow';
			ctx.font = '40px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('Whackam Style', CANVAS_WIDTH/2 ,CANVAS_HEIGHT/4);
			
			
			// Draw menu buttons
			for (var i = 0; i < MENU_BUTTONS; i++) 
			  buttons[i].draw(ctx);
			 
			// Game Menu Text in buttons
			ctx.fillStyle = 'black';
			ctx.font = '25px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillText('START GAME', CANVAS_WIDTH/2 ,CANVAS_HEIGHT*4/10 + 11);
			ctx.fillText('LEADERBOARD', CANVAS_WIDTH/2 ,CANVAS_HEIGHT*6/10 + 11);
			
			ctx.fillStyle = 'orange';
			ctx.font = '15px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';
			ctx.fillText('Jasmin Giroux & Jonathan Lacasse', CANVAS_WIDTH/2 ,CANVAS_HEIGHT*9/10);
		} else {
			ctx.fillStyle = 'yellow';
			ctx.font = '40px san-serif';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillText('LEADERBOARD', 5 * CANVAS_WIDTH/100, 8 * CANVAS_HEIGHT/100);
			
			ctx.textAlign = 'center';
			ctx.font = '25px san-serif';
			if (leaderboard.working) {
				if (++curLeaderboardDelay > DELAY_SHOW) {
					curLeaderboardDelay = 0;
					leaderboard.refresh();
				}
				ctx.fillStyle = 'orange';
				ctx.fillText('Fetching...', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
			} else if (!leaderboard.success) {
				ctx.fillStyle = 'red';
				ctx.fillText('Something went wrong. Try refreshing.', CANVAS_WIDTH/2, 70 * CANVAS_HEIGHT/100);
			} else {
				ctx.fillStyle = 'yellow';
				for (var i = 0; i < leaderboard.scores.length; i++)
				{
					score = leaderboard.scores[i];
					
					if (score.Points == '') {
						score.Points = '0';
					}
					
					ctx.textAlign = 'left';
					ctx.fillText(score.Name, 17 * CANVAS_WIDTH/100, ((i + 1) * 6) * CANVAS_HEIGHT/100 + 60);
					ctx.textAlign = 'right';
					ctx.fillText('#' + score.Rank, 15 * CANVAS_WIDTH/100, ((i + 1) * 6) * CANVAS_HEIGHT/100 + 60)
					ctx.fillText(score.Points, 95 * CANVAS_WIDTH/100, ((i + 1) * 6) * CANVAS_HEIGHT/100 + 60);
				}
				ctx.fillStyle = 'orange';
				ctx.textAlign = 'center';
				ctx.fillText('Page ' + leaderboard.curPage + ' of ' + Math.ceil(leaderboard.numScores/10), CANVAS_WIDTH/2, CANVAS_HEIGHT*75/100);
			}
			
			// Draw leaderboard buttons
			ctx.fillStyle = 'black';
			ctx.font = '25px san-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			
			if (leaderboard.curPage > 1) {
				buttons[4].draw(ctx);
				ctx.fillText('PREV', 5 * CANVAS_WIDTH/100 + 30, CANVAS_HEIGHT*8/10 + 11);
			}
			
			buttons[5].draw(ctx);
			ctx.fillText('MENU', 2 * CANVAS_WIDTH/4, CANVAS_HEIGHT*8/10 + 11);
			
			if (leaderboard.curPage * leaderboard.perPage < leaderboard.numScores) {
				buttons[6].draw(ctx);
				ctx.fillText('NEXT', 95 * CANVAS_WIDTH/100 - 30, CANVAS_HEIGHT*8/10 + 11);
			}
			
			buttons[7].draw(ctx);
			ctx.fillText('REFRESH', 90 * CANVAS_WIDTH/100, CANVAS_HEIGHT*5/100 + 11);
		}
	}
}

// Creates an object with x and y defined as the mouse position
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  return {x: mx, y: my};
}

function addTime(time)
{
	return time + Math.floor(Math.random() * 10) - Math.floor(points/DIFFICULTY);
}

function getFreeSpawnPoint(shape)
{
	do 
	{
		// Take off 0.001 because Math.random can give 1
		var i = Math.floor((Math.random()-0.001) * spawnPoints.length);
		if(!spawnPoints[i].occupied)
		{
			spawnPoints[i].occupied = true;
			shape.x = spawnPoints[i].x + 65;
			shape.y = spawnPoints[i].y + 40;
			return i;
		}
	}while(1 == 1)
}

function init() {
  // Log view to Playtomic
  Playtomic.Log.View(951725, '580bc45f0339416a', '5bbe25a8e9414b6f85fb7b0b8c7735', document.location);
  
  var s = new CanvasState(document.getElementById('canvas'));
  
  // BACKGROUND
  imgBackground = new Image();
  imgBackground.src = PATH_BACKGROUND;
  s.background = new Shape(imgBackground, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0);
  
  // BUTTONS
  var imgButton = new Image();
  imgButton.src = PATH_BUTTON;
  // Menu
  s.addButton(new Shape(imgButton, CANVAS_WIDTH/2 - BUTTON_WIDTH/2, CANVAS_HEIGHT*4/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  s.addButton(new Shape(imgButton, CANVAS_WIDTH/2 - BUTTON_WIDTH/2, CANVAS_HEIGHT*6/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  // Game Over
  s.addButton(new Shape(imgButton, CANVAS_WIDTH/4 - BUTTON_WIDTH/2, CANVAS_HEIGHT*6/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  s.addButton(new Shape(imgButton, 3 * CANVAS_WIDTH/4 - BUTTON_WIDTH/2, CANVAS_HEIGHT*6/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  // Leaderboard
  s.addButton(new Shape(imgButton, 5 * CANVAS_WIDTH/100 - BUTTON_WIDTH/2, CANVAS_HEIGHT*8/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  s.addButton(new Shape(imgButton, CANVAS_WIDTH/2 - BUTTON_WIDTH/2, CANVAS_HEIGHT*8/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  s.addButton(new Shape(imgButton, 95 * CANVAS_WIDTH/100 - BUTTON_WIDTH/2, CANVAS_HEIGHT*8/10, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  s.addButton(new Shape(imgButton, 95 * CANVAS_WIDTH/100 - BUTTON_WIDTH/2, CANVAS_HEIGHT*5/100, BUTTON_WIDTH, BUTTON_HEIGHT, 0));
  
  // SPAWNPOINTS
  var imgSpawnPoint = new Image();
  imgSpawnPoint.src = PATH_SPAWNPOINT;
  spawnPoints.push(new SpawnPoint(imgSpawnPoint, CANVAS_WIDTH/100, CANVAS_HEIGHT/100, SPAWNPOINT_WIDTH, SPAWNPOINT_HEIGHT));
  spawnPoints.push(new SpawnPoint(imgSpawnPoint, 35 * CANVAS_WIDTH/100, CANVAS_HEIGHT/100, SPAWNPOINT_WIDTH, SPAWNPOINT_HEIGHT));
  spawnPoints.push(new SpawnPoint(imgSpawnPoint, 68 * CANVAS_WIDTH/100, CANVAS_HEIGHT/100, SPAWNPOINT_WIDTH, SPAWNPOINT_HEIGHT));
  
  spawnPoints.push(new SpawnPoint(imgSpawnPoint, CANVAS_WIDTH/100, 50 * CANVAS_HEIGHT/100, SPAWNPOINT_WIDTH, SPAWNPOINT_HEIGHT));
  spawnPoints.push(new SpawnPoint(imgSpawnPoint, 35 * CANVAS_WIDTH/100, 50 * CANVAS_HEIGHT/100, SPAWNPOINT_WIDTH, SPAWNPOINT_HEIGHT));
  spawnPoints.push(new SpawnPoint(imgSpawnPoint, 68 * CANVAS_WIDTH/100, 50 * CANVAS_HEIGHT/100, SPAWNPOINT_WIDTH, SPAWNPOINT_HEIGHT));
  
  // MOLES
  var imgMole = new Image();
  imgMole.src = PATH_MOLE;
  s.addMole(new Shape(imgMole, spawnPoints[0].x + 40, spawnPoints[0].y + 60, MOLE_WIDTH, MOLE_HEIGHT, 3));
  s.addMole(new Shape(imgMole, spawnPoints[1].x + 40, spawnPoints[1].y + 60, MOLE_WIDTH, MOLE_HEIGHT, 3));
  s.addMole(new Shape(imgMole, spawnPoints[2].x + 40, spawnPoints[2].y + 60, MOLE_WIDTH, MOLE_HEIGHT, 3));
}

init();
