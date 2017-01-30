
var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2003);
console.log("Server started.");
 
var SOCKET_LIST = {};
var counter = 0;

Player = function(x){
    var self = {
        id:x,
        position:10,
        amount:1000,
        name:'',
        ready:false,
        call:0,
        played:false
    }
    
    var cards = [];
    
    self.setCards = function(p){
        cards.push(p);
    }

    self.changeName = function(x){
        self.name = x;
    }
    
    self.changePosition = function(x){
        self.position = x;
    }
    
    self.changeAmount = function(x){
        self.amount = self.amount + x;
    }
    
    self.changeReady = function(){
        self.ready = !self.ready;
    }
    
    self.changeCall = function(x){
        self.call = x;
    }
    
    self.changePlayed = function(){
        self.played = !self.played;
    }

    return self;
}


Chair = function(x){
    var self = {
        occupied: false,
        position: x
    }
    return self;
}

Card = function(x){
    var temp = getCard();

     var self = {
        type:temp.type,
        suit:temp.suit,
        typeID:temp.typeID,
        suitID:temp.suitID,
        player: x
    }
    
    Card.list[counter] = self;
    counter = counter + 1;

    return self;
}

Game = function(){
    var self = {
        bigblindA:100,
        smallblindA:50,
        bigblindP:10,
        smallblindP:10,
        call:100,
        amount:0,
        stage:0,
        dealer:10,
        players:[],
        at:10
    }
    
        
    self.addToPot = function(x){
        self.amount = self.amount + x;
    }
    
    self.clearPot = function(){
        self.amount = 0;
    }
    
    self.changeStage = function(x){
        self.stage = x;
    }
    
    self.getBigblind = function(){
        return {
            amount:self.bigblindA,
            position:self.bigblindP
        };
    }
    
    self.getSmallblig = function(){
        return {
            amount:self.smallblindA,
            position:self.smallblindP
        };
    }
    
    self.changeBigblind = function(x){
        self.bigblindP = x;
    }
    
    self.changeSmallblind = function(x){
        self.smallblindP = x;
    }
    
    self.changeCallAmount = function(x){
        self.call = x;
    }
    
    self.addPlayers = function(x){
        self.players = x.slice();
    }
    
    return self;
}


var cards = [];
var chairs = [];
var Players = [];
Card.list = {};
var gameOn = false;
var position = 10;
var isStageOver = true;

var game = Game();
   
setChairs();

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    var player = Player(socket.id);
    Players.push(player);
    console.log(socket.id+" connected");
    
    socket.on('sendMsgToServer',function(data){
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat', player.name + ': ' + data);
        }
    });
    
    socket.on('joinedToServer',function(data){
        addToChat(data);
    });
    
    socket.on('playerName', function(data){
        player.changeName(data); 
    });
    
    socket.on('disconnect',function(){
        if(player.position < 9){
            chairs[player.position].occupied = false;
        }
        updateSeats();
        if(player.name != ''){
            addToChat(player.name+" has left");
        }

        delete SOCKET_LIST[socket.id];
        game.players.splice(game.players.indexOf(player),1);
        Players.splice(Players.indexOf(player),1);
        console.log(socket.id+" disconnected ");
        
        if(Players.length == 1){
            gameOn = false;
            SOCKET_LIST[Players[0].id].emit('clearCards');
        }
    });
    
    socket.on('takePlace', function(data){
        player.changePosition(data);
        chairs[data].occupied = true;
        
        updateSeats();
        if(!gameOn){ 
            gameIsReady();
        }
    });
    
    socket.on('ready',function(){
       player.changeReady();
       if(!gameOn){
           gameIsReady();
       }
    });
    
    socket.on('getSeats',function(data){
        console.log("seats' update");
        updateSeats();
    });
    
    socket.on('call',function(){
        game.addToPot(game.call-player.call);
        player.changeAmount(player.call-game.call);
        player.changeCall(game.call);
        player.changePlayed();
        nextPlayer(player);
        updateSeats();
    });
    
    socket.on('raise', function(x){
        game.changeCallAmount(x);
        game.addToPot(x);
        player.changeAmount(player.call-game.call);
        player.changeCall(game.call);
        for(var i in Players){
            Players[i].played = false;
        }
        player.changePlayed();
        nextPlayer(player);
        updateSeats();
    });
    
    socket.on('fold', function(){
        if(game.players.length == 2){
            game.players.splice(game.players.indexOf(player),1);
        }else{
            if(player.position == game.dealer){
                var i = game.players.indexOf(player);
                if(i+1 < game.players.length){
                    game.dealer = game.players[i+1].position
                }else{
                    game.dealer = game.players[0];
                }
            }
            game.players.splice(game.players.indexOf(player),1);
        }
        
    });
    
    socket.on('getMinCall', function(cb){
        var returnvalue = {
            mincall:game.bigblindA,
            currcall:game.call
        }
        cb(returnvalue);
    });
    
});

function nextPlayer(player){
    var index = game.players.indexOf(player);
    isStageOver = true;
    
    for(var i in game.players){
        if(game.players[i].played == false){
            isStageOver = false;
        }
    }
    
    if(!isStageOver){
        if(index+1 < game.players.length){
            SOCKET_LIST[game.players[index+1].id].emit('allow',game.call > game.players[index+1].call);
        }else{
            SOCKET_LIST[game.players[0].id].emit('allow',game.call > game.players[0].call);
        }
    }else{
        if(game.stage < 4){
            dealCards();
            game.changeStage(game.stage+1);
            game.changeCallAmount(0);
            var dealerPlayer;
            
            for(var i = 0; i < game.players.length; i++){
                if(game.players[i].position == game.dealer){
                    if(i+1 < game.players.length){
                        game.at = game.players[i+1].position;
                        break;
                    }else {
                        game.at = game.players[0].position;
                        break;
                    }
                }
            }
            callAllow(game.at);
            for(var i in game.players){
                SOCKET_LIST[game.players[i].id].emit('addToChat',"End of the stage");
            }
        }
    }
}

function dealCards(){
    if(game.stage == 0){
        for(var i = 0; i < 3;i++){
            var tablecard = Card(2);
            var data ={
                typeID:tablecard.typeID, 
                suitID:tablecard.suitID,
                x:i
            }; 
            for(var k in SOCKET_LIST){
                SOCKET_LIST[k].emit("drawTableCard",data);
            }
        }
    }else if(game.stage == 1){
        var tablecard = Card(2);
        var data ={
            typeID:tablecard.typeID, 
            suitID:tablecard.suitID,
            x:3
        }; 
        for(var k in SOCKET_LIST){
            SOCKET_LIST[k].emit("drawTableCard",data);
        }
    }else if(game.stage == 2){
        var tablecard = Card(2);
        var data ={
            typeID:tablecard.typeID, 
            suitID:tablecard.suitID,
            x:4
        }; 
        for(var k in SOCKET_LIST){
            SOCKET_LIST[k].emit("drawTableCard",data);
        }
    }
}

function callAllow(x){
    for(var i in game.players){
        game.players[i].changePlayed();
        game.players[i].changeCall(0);
        if(game.players[i].position == x){
            SOCKET_LIST[game.players[i].id].emit('allow',game.call > game.players[i].call);
        }
    }
    updateSeats();
}

function gameIsReady(){
    if(getReadyPlayers() > 1 && gameOn == false){
        gameOn = true;
        var counter = 10;
        var t = setInterval(function(){    
            for(var i in SOCKET_LIST){
                SOCKET_LIST[i].emit('addToChat', "Game will start in "+counter+" seconds");
            }
            if(counter == 1){
                clearInterval(t);
                startGamePre();
            }
            counter--;

        },1000);
    }
    
}

function startGamePre(){
    var validPlayers = [];
    for(var i = 0 ; i < Players.length; i++){
        if(Players[i].position < 9 && Players[i].name != ''){
            validPlayers.push(Players[i]);
        }
    }
    
    game.addPlayers(validPlayers);
    game.players.sort(function(a,b){
        return a.position - b.position;
    }); 
    
    if(position == 10){
        game.dealer = game.players[0].position;
        position = game.dealer;
    }else {
        for(var i in game.players){
            if(game.players[i].position > position){
                game.dealer = game.players[i].position;
                position = game.players[i].position;
                break;
            }
        }
    }
    startGame();
}

function startGame(){
    for(var i = 0; i < game.players.length; i++){
        if(game.players[i].position == game.dealer){
            if(game.players.length == 2){
                game.smallblindP = game.players[i].position;
                game.at = game.dealer;
                if(i == game.players.length - 1){
                    game.bigblindP = game.players[0].position;
                }else{
                    game.bigblindP = game.players[i+1].position;
                }
                break;
            }else if(game.players.length > 2){
                //game.at = game.dealer;
                if(i+1 < game.players.length){
                    game.smallblindP = game.players[i+1].position;
                    if(i+2 < game.players.length){
                        game.bigblindP = game.players[i+2].position;
                        if(i+3 < game.players.length){
                            game.at = game.players[i+3].position;
                        }else{
                            game.at = game.players[0].position;
                        }
                    }else{
                        game.bigblindP = game.players[0].position;
                        game.at = game.players[1].position;
                    }
                    
                    break;
                }else {
                    game.smallblindP = game.players[0].position;
                    game.bigblindP = game.players[1].position;
                    game.at = game.players[2].position;
                    break;
                }
            }
        }
    }

    for(let i in game.players){
        var card1 = Card(game.players[i].id);
        var card2 = Card(game.players[i].id);

        var returnvalue = [{typeID:card1.typeID, suitID:card1.suitID}, {typeID:card2.typeID, suitID:card2.suitID}];

        giveCards(SOCKET_LIST[game.players[i].id], returnvalue);
        if(game.players[i].position == game.at){
            SOCKET_LIST[game.players[i].id].emit('allow',game.call > game.players[i].call);
        }
    }
    
    for(let i in game.players){
        if(game.players[i].position == game.smallblindP){
            game.addToPot(game.smallblindA);
            game.players[i].changeAmount(-game.smallblindA);
            game.players[i].changeCall(50);
        }else if(game.players[i].position == game.bigblindP){
            game.addToPot(game.bigblindA);
            game.players[i].changeAmount(-game.bigblindA);
            game.players[i].changeCall(100);
        }
    }
    
    updateSeats();
    
}

function getAllowValue(pl){}

function getReadyPlayers(){
    var counter = 0;
    for(var i in Players){
        if(Players[i].ready = true && Players[i].name !='' && Players[i].position < 9){
            counter++;
        }
    }
    
    return counter;
}

function giveCards(x,data){
    x.emit('sendCards',data);
}

function addToChat(data){
    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('addToChat', data);
    }
}

function updateSeats(){    
    var returnvalue = {
        chairs:chairs,            
        players:Players,
        pot: game.amount
    }
        
    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('updateSeats', returnvalue);        
    } 
}

function setChairs(){
    
    for(var i = 0; i < 9; i++){
        var chair = Chair(i);
        chairs.push(chair);
    }

    
}

function getCard(){
    var check = true;
    var secondCheck = 0;
    var type;
    var suit;
    while(check){
        type = Math.floor(Math.random() * 13)+1;
        suit = Math.floor(Math.random() * 4)+1;

        for( var i in Card.list){
            var temp = Card.list[i];
            if(temp.suit === returnSuit(suit) && temp.type === returnType(type)){
                secondCheck = 1;
            }
        }

        if(secondCheck === 0){
            check = false;
        }

        secondCheck = 0;
    }

    return {
        suit: returnSuit(suit),
        type: returnType(type),
        typeID: type,
        suitID: suit
    };
}   

function returnSuit(x){
    switch (x) {
        case 1:
            return "clubs";
        case 2:
            return "spades";
        case 3:
            return "hearts";
        case 4:
            return "diamonds";
    }

}

function returnType(x){
    if(x <= 10){
        return x;
    }else{
        switch (x) {
        case 11:
            return "Jack";
        case 12:
            return "Queen";
        case 13:
            return "King";
        case 1:
            return "Ace";
        }
    }
}
















































