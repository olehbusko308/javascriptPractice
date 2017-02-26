var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");

var position;
var Cards = [];
var Chairs = {};
var Players = [];
var gameOn = false;
var SOCKET_LIST = {};
var game = new Game(); 
var isStageOver = true;

setChairs();

function Player(x){
    this.id = x;
    this.pot = 0;
    this.call = 0;
    this.name = 'Name';
    this.cards = [];
    this.position = 10;
    this.amount = 1000;
    this.played = false;
    this.ready = true;
    this.last_action = '';
}

function Chair(x){
    this.position = x;
    this.occupied = false;
    this.player = null;
}

function Card(x){
    var temp_holder = getCard();
    
    this.type = temp_holder.type;
    this.suit = temp_holder.suit;
    this.typeID = temp_holder.typeID;
    this.suitID = temp_holder.suitID;
    
    Cards.push(this);
}

function Game(){
    this.big_blind = {
        amount: 100,
        position: 10
    }
    this.small_blind = {
        amount: 50,
        position: 10
    }
    
    this.pot = 0;
    this.stage = 0;
    this.call = 100;
    this.dealer = 10;
    this.players = [];
    this.at = 10;
}

var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    
    SOCKET_LIST[socket.id] = socket;
    var player = new Player(socket.id);
    
    Players.push(player);
    
    
    console.log(socket.id+" connected");
    
    socket.on('message',function(data){
        addToChat(player.name + ': ' + data);
    });
    
    socket.on('joined_to_server',function(data){
        addToChat(data);
    });
    
    socket.on('player_name', function(data){
        player.name = data;
    });
    
    socket.on('disconnect',function(){
        if(player.position < 7){
            Chairs[player.position].occupied = false;
        }
        
        if(player.name != ''){
            addToChat(player.name+" has left");
        }
        
        game.players.splice(game.players.indexOf(player),1);
        Players.splice(Players.indexOf(player),1);
        
        if(Players.length == 1){
            gameOn = false;
            SOCKET_LIST[Players[0].id].emit('clearCards');
        }
        
        updateSeats();
        delete SOCKET_LIST[socket.id];
        
        console.log(socket.id+" disconnected ");
        
    });
    
    socket.on('take_place', function(data){
        player.position = data;
        Chairs[data].occupied = true;
        Chairs[data].player = player;
        
        update();
        socket.emit('move_positions', Chairs);

        if(!gameOn){ 
            gameIsReady();
        }
        
    });
    
//--//?
    /*
    socket.on('ready',function(){
       player.changeReady();
       if(!gameOn){
           gameIsReady();
       }
    });
    
    socket.on('update',function(){
        updateSeats();
    });
    */
    socket.on('call',function(){
//---   //needs to be changed
        game.pot = game.pot + (game.call-player.call);
        //animations should be called here
        
        countdown_call(player);
        
        player.amount = player.amount + (player.call-game.call);
        player.call = game.call;
        player.played = true;
        
        nextPlayer(player);
        
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('update_calls', Chairs);
        }
        
        updateSeats();
    });
    
    socket.on('raise', function(x){
        game.call = x;
        
//---   //needs to be changed
        game.pot = game.pot + (x - player.call);
        
        countdown_call(player);
        
        player.amount = player.amount + (player.call - game.call);
        player.call = game.call;
        
        for(var i in Players){
            Players[i].played = false;
        }
        
        player.played = true;
        
        nextPlayer(player);
        
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('update_calls', Chairs);
        }
        
        updateSeats();
    });
    
    socket.on('fold', function(){
        if(game.players.length == 2){
            game.players.splice(game.players.indexOf(player),1);
        }else{
            
//---       //needs to be changed
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
    
    socket.emit('update', Chairs);
    
});

//function to do the countdown where ever the game is ready
function gameIsReady(){
    if(getReadyPlayers() > 1 && gameOn == false){
        
        gameOn = true;
        
        startGamePre();
        /*
        var counter = 10;
        
        var t = setInterval(function(){    
            
            addToChat("Game will start in "+counter+" seconds");
            
            if(counter == 1){
                clearInterval(t);
                startGamePre();
            }
            
            counter--;

        },1000);
    */
    }
    
    
}

//function to get amount of players that are ready to play
function getReadyPlayers(){
    var counter = 0;
    for(var i in Players){
        if(Players[i].ready == true && Players[i].name != '' && Players[i].position < 7){
            counter++;
        }
    }
    return counter;
}

//adds players to the game and sets the dealer
function startGamePre(){
    var validPlayers = [];
    for(var i = 0 ; i < Players.length; i++){
        if(Players[i].position < 7 && Players[i].name != ''){
            validPlayers.push(Players[i]);
        }
    }
    
    game.players = validPlayers.slice();
    game.players.sort(
        function(a,b){
            return a.position - b.position;
        }
    ); 
    
    if(position == 10){
        game.dealer = game.players[0].position;
        position = game.dealer;
    }else {
        for(var i = 0; i < game.players.length; i++){
            
            if(game.players[i].position > position){
                game.dealer = game.players[i].position;
                position = game.players[i].position;
                break;
            }else if( i + 1 == game.players.length){
                game.dealer = game.players[0].position;
                position = game.players[0].position;
            }
            //added above
        }
    }
    startGame();
}

//sets game positions and deals cards
function startGame(){
    //sets blinds and game at
    for(var i = 0; i < game.players.length; i++){
        if(game.players[i].position == game.dealer){
            if(game.players.length == 2){
                
                game.small_blind.position = game.players[i].position;
                game.at = game.dealer;
                
                if(i == game.players.length - 1){
                    game.big_blind.position = game.players[0].position;
                }else{
                    game.big_blind.position = game.players[i+1].position;
                }
                break;
            
            }else if(game.players.length > 2){
            
                //game.at = game.dealer;
                if(i+1 < game.players.length){
                    
                    game.small_blind.position = game.players[i+1].position;
                
                    if(i+2 < game.players.length){
                        game.big_blind.position = game.players[i+2].position;
                        if(i+3 < game.players.length){
                            game.at = game.players[i+3].position;
                        }else{
                            game.at = game.players[0].position;
                        }
                    }else{
                        game.big_blind.position = game.players[0].position;
                        game.at = game.players[1].position;
                    }
                    
                    break;
                
                }else {
                    
                    game.small_blind.position = game.players[0].position;
                    game.big_blind.position = game.players[1].position;
                    game.at = game.players[2].position;
                    
                    break;
                }
            
            }
        }
    }

    //deals cards to everyone in the game
    for(let i in game.players){
        var card1 = new Card(game.players[i].id);
        var card2 = new Card(game.players[i].id);

        var returnvalue = [{typeID:card1.typeID, suitID:card1.suitID}, {typeID:card2.typeID, suitID:card2.suitID}];

        giveCards(SOCKET_LIST[game.players[i].id], returnvalue);
        
        if(game.players[i].position == game.at){
            next_player_turn(game.players[i]);
        }
    }
    
    //takes the blinds amount from the players
    for(let i in game.players){
        if(game.players[i].position == game.small_blind.position){
            //needs to be changed
            game.pot = game.pot + game.small_blind.amount;
        
            game.call = 50;
            countdown_call(game.players[i]);
            game.call = 100;
            
            game.players[i].call = 50;
            game.players[i].amount = game.players[i].amount - game.small_blind.amount;
        }else if(game.players[i].position == game.big_blind.position){
            //needs to be changed
            game.pot = game.pot + game.big_blind.amount;
            
            countdown_call(game.players[i]);
            
            game.players[i].call = 100;
            game.players[i].amount = game.players[i].amount - game.big_blind.amount;
        }
    }
    
    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('update_calls', Chairs);
    }
    
    updateSeats();
    
}

//function to determine the next player
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
            next_player_turn(game.players[index + 1]);
        }else{
            next_player_turn(game.players[0]);
        }
    }else{
        var info = {
            pot:game.pot,
            stage:game.stage
        }
        
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('end_of_stage', info);
        }
        
        if(game.stage < 4){
            deal_cards();
            
            game.stage = game.stage + 1;
            game.call = 0;
            
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
            
            allow_action(game.at);
            
            for(var i in game.players){
                SOCKET_LIST[game.players[i].id].emit('addToChat',"End of the stage");
            }
        }
    }
}


//allows a player to do some game actions
function allow_action(x){
    for(var i in game.players){
        
        //wrong?
        game.players[i].played = !game.players[i].played;
        game.players[i].call = 0;
        
        if(game.players[i].position == x){
            next_player_turn(game.players[i]);
        }
    }
    
    
    
}

function deal_cards(){
    if(game.stage == 0){
        for(var i = 0; i < 3;i++){
            var tablecard = new Card(2);
            
            var data ={
                typeID:tablecard.typeID, 
                suitID:tablecard.suitID,
                x:i
            }; 
            for(var k in SOCKET_LIST){
                SOCKET_LIST[k].emit("table_card",data);
            }
        }
    }else if(game.stage == 1){
        var tablecard = new Card(2);
        var data ={
            typeID:tablecard.typeID, 
            suitID:tablecard.suitID,
            x:3
        }; 
        for(var k in SOCKET_LIST){
            SOCKET_LIST[k].emit("table_card",data);
        }
    }else if(game.stage == 2){
        var tablecard = new Card(2);
        var data ={
            typeID:tablecard.typeID, 
            suitID:tablecard.suitID,
            x:4
        }; 
        for(var k in SOCKET_LIST){
            SOCKET_LIST[k].emit("table_card",data);
        }
    }
}


function giveCards(x, data){
    x.emit('cards',data);
}


function addToChat(data){
    /*
    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('addToChat', data);
    }
    */
}

function updateSeats(){    
    var returnvalue = {
        chairs:Chairs,            
        players:Players,
        pot: game.amount
    }
        
    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('updateSeats', returnvalue);        
    } 
}

function setChairs(){
    
    for(var i = 0; i < 7; i++){
        var chair = new Chair(i);
        Chairs[i] = chair;
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

        for( var i = 0; i < Cards.length;i++){
            var temp = Cards[i];
            if(temp.suitID === suit && temp.typeID === type){
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

//delete??
function returnSuit(x){
    switch (x) {
        case 1:
            return "hearts";
        case 2:
            return "diamonds";
        case 3:
            return "clubs";
        case 4:
            return "spades";
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

function update(){
    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('update', Chairs);
    }
}

function countdown_call(player){
    var info = {
        original_amount:player.amount,
        change_by:game.call - player.call,
        position:player.position,
        chairs:Chairs
    }

    for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('call_animation',info);
    }
}

function next_player_turn(player){
    var low;
    
    if(game.call == 0){
        low = 100;
    }else{
        low = game.call + 100;
    }
    
    var info = {
        upper_bound:player.amount,
        lower_bound:low,
        check:game.call == player.call
    }
    
    SOCKET_LIST[player.id].emit('your_turn', info);
}
