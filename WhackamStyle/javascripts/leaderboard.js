// ** Leaderboard **
function Leaderboard(submitCallback, listCallback) {
  this.boardName = 'leaderboard';
  this.perPage = 10;
  this.curPage = 1;
  this.scores = [];
  this.numScores = 0;
  this.working = false;
  this.success = false;
  this.submitCallback = submitCallback;
  this.listCallback = listCallback;
}

Leaderboard.prototype.clear = function() {
	this.scores = [];
	this.numScores = 0;
	this.working = false;
	this.success = false;
}

Leaderboard.prototype.submit = function(username, score) {
  this.clear();
  this.working = true;
  var playerScore = {};
  playerScore.Name = username;
  playerScore.Points = score;
 
  // Submit to the leaderboard
  Playtomic.Leaderboards.Save(playerScore, 
                              this.boardName, 
							  this.submitCallback,
							  {allowduplicates: true});
}

Leaderboard.prototype.show = function() {
  this.clear();
  this.working = true;
  curPage = 1;
  Playtomic.Leaderboards.List(this.boardName, 
							  this.listCallback, 
							  {page: this.curPage, perpage: this.perPage});
}

Leaderboard.prototype.refresh = function() {
  this.clear();
  this.working = true;
  Playtomic.Leaderboards.List(this.boardName, 
							  this.listCallback, 
							  {page: this.curPage, perpage: this.perPage});
}

Leaderboard.prototype.showPrev = function() {
  if (this.curPage > 1) {
    this.clear();
	this.working = true;
    this.curPage--;
    Playtomic.Leaderboards.List(this.boardName, 
	                            this.listCallback, 
								{page: this.curPage, perpage: this.perPage});
  }
}

Leaderboard.prototype.showNext = function() {
	if (this.curPage * this.perPage < this.numScores) {
      this.clear();
	  this.working = true;
	  this.curPage++;
	  Playtomic.Leaderboards.List(this.boardName, 
	                              this.listCallback, 
								  {page: this.curPage, perpage: this.perPage});
    }
}