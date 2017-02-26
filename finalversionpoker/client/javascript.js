window.onload = function(){
    setUpTable();
    setUpDealer();
    setUpPot();
    setUpPlayerscall();
    intialize_moveby();
}

socket.on('update', function(data){
    game_positions = data;
    
    update_positions(get_right_order(data));
    
});

socket.on('update_calls',function(data){
    update_calls(get_right_order(data));
});

socket.on('move_positions',function(data){
    move_positions(data);
});

var pot_amount = 0;
var stage = 0;
socket.on('end_of_stage', function(x){
    pot_amount = x.pot;
    stage = x.stage;
    hideCalls(); 
});

socket.on('your_turn', function(data){
    if(data.check){
        document.getElementById("call").innerHTML = "Check";
    }else{
        document.getElementById("call").innerHTML = "Call";
    }
    
    document.getElementById('slider').max = data.upper_bound;
    document.getElementById('slider').min = data.lower_bound;
    document.getElementById('slider').value = data.lower_bound;
    
    document.getElementById("call").style.visibility = "visible";
    document.getElementById("raise").style.visibility = "visible";
    document.getElementById("fold").style.visibility = "visible";
});

socket.on('cards', function(data){
    update_cards(data);
});

socket.on('call_animation', function(data){
    
    var temp_holder = get_right_order(data.chairs);
    update_calls(temp_holder);
    
    for(var i in temp_holder){
        if(temp_holder[i].position == data.position){
            
            var temp_position = parseInt(i) + 1;
            var info = {
                original_amount:data.original_amount,
                change_by:data.change_by,
                position: temp_position
            }
            
            call_raise(info);
            break;
        };
    }
    
});

socket.on('table_card',function(data){
    var card = document.getElementById('tablecard'+(data.x + 1));
    var cardCtx = card.getContext("2d");
    var cards = new Image();
    
    cardCtx.scale(2,2);
    card.style.opacity = 1;
    
    cards.onload = function(){
        cardCtx.drawImage(cards, 
                ((data.typeID - 1)*168) + (data.typeID * 16) - (data.typeID * 0.417), 
                ((data.suitID - 1)*252)+ (data.suitID * 16), 
                168, 252, 0, 0, 80, 115);
    }
    
    cards.src = "client/img/cards.png";
});





//hover on and off
var allowed_list = [];
function hover(x){
    if(x == 7){
        document.getElementById("player").style.boxShadow ="0 0 3pt 2pt #6699ff";
    }else{
        document.getElementById("chair"+x).style.boxShadow ="0 0 3pt 2pt #6699ff";
    }
}

function unhover(x){
    if(x == 7){
        document.getElementById("player").style.boxShadow ="";
    }else{
        document.getElementById("chair"+x).style.boxShadow ="";
    }
}




//set up functions
function setUpTable(){
    var table = document.getElementById("table");
    var tableCtx = table.getContext("2d");
    tableCtx.scale(2,2);

    var tablepic = new Image();

    tablepic.onload = function(){
        tableCtx.drawImage(tablepic,0,0,2304,1142,0,0,880,440);
    }

    tablepic.src = "client/img/table.png";
}

function setUpDealer(){
    var dealer = document.getElementById("dealer");
    var dealerCtx = dealer.getContext("2d");

    var dealerpic = new Image();

    dealerCtx.scale(2,2);
    dealerCtx.fillStyle = "#2F2F2F";
    dealerCtx.fillRect(0,0,100,125);
    
    dealerCtx.fillStyle = "white";
    dealerCtx.textAlign = "center";
    dealerCtx.font = "bold 17px Frosty";

    dealerCtx.fillText("Dealer", 48, 115);
    
    dealerpic.onload = function(){
        dealerCtx.drawImage(dealerpic,0,0,536,542,0,0,100,100)
    }
    
    dealerpic.src="client/img/dealer.png";
}

function setUpPot(){
    var potimage = document.getElementById("potimage");
    var potimageCtx = potimage.getContext("2d");
    var chip = new Image();
    
    potimageCtx.scale(2,2);
    chip.onload = function(){
        potimageCtx.drawImage(chip, 0, 0, 308, 306, 0, 0, 30, 30);
    }
    
    chip.src = "client/img/dealerchip.png";
    
    var pot = document.getElementById("pot");
    var potCtx = pot.getContext("2d");
    
    var grd = potCtx.createLinearGradient(50,0,50,15);
    grd.addColorStop(0,"#FFD700");
    grd.addColorStop(1,"#FFA500");
    
    potCtx.scale(2,2);
    
    potCtx.fillStyle = grd;
    potCtx.fillRect(0,0,110,28);
    
    /*
    potCtx.font = "bold 18px Frosty";
    potCtx.fillStyle = "#2F2F2F";
    potCtx.textAlign = "center";

    potCtx.fillText("$1000", 50, 20);
    */
}

function setUpPlayerscall(){

    var chip = new Image();
    
    chip.onload = function(){
        for(var i = 1; i < 7;i++){
            var chairchip = document.getElementById("chair"+i+"chip");
            var chairchipCtx = chairchip.getContext("2d");
            
            $('#chair'+(i)+'chip').fadeOut(10);
            $('#chair'+(i)+'call').fadeOut(10);
            
            chairchipCtx.scale(2,2);
            chairchipCtx.drawImage(chip, 0, 0, 308, 306, 0, 0, 30, 30);
        }
        
        var playerchip = document.getElementById("playerchip");
        var playerchipCtx = playerchip.getContext("2d");
        
        $('#playerchip').fadeOut(10);
        $('#playercall').fadeOut(10);
        
        playerchipCtx.scale(2,2);
        playerchipCtx.drawImage(chip, 0, 0, 308, 306, 0, 0, 30, 30);
    }
    
    chip.src = "client/img/dealerchip.png";
}



//buttons hover effect and event listeners
function over(x){
    document.getElementById(""+x+"").style.boxShadow ="0 0 3pt 2.5pt #ffff99";
}

function out(x){
    document.getElementById(x).style.boxShadow ="";
}

var animation_1;
var callblock_size = 100;

function hideCalls(){
    callblock_size = callblock_size - 5;
    for(var i = 1; i < 4;i++){
        document.getElementById("chair"+i+"call").style.width = callblock_size+"px";
    }
    
    for(var i = 4; i < 7;i++){
        var rect = document.getElementById("chair"+i+"call").getBoundingClientRect();
    
        var new_left = rect.left - 40 + 5;
        document.getElementById("chair"+i+"call").style.left = new_left+"px";
        document.getElementById("chair"+i+"call").style.width = callblock_size+"px";
    }
    
    document.getElementById("playercall").style.width = callblock_size+"px";

    animation_1 = requestAnimationFrame(hideCalls);
    
    if(callblock_size < 0){
        cancelAnimationFrame(animation_1);

        for(var i = 1; i < 7;i++){
            $('#chair'+i+"call").fadeOut(1, function(){
                document.getElementById(this.id).style.width = "100px";
            });
        }
        
        $('#playercall').fadeOut(1,function(){
            document.getElementById("playercall").style.width = "100px";
        });
        
        callblock_size = 100;
        
        moveChips();
    }

}

var moveby = [];
var original_positions = [];
var animation_2;
var counter = 0;

function moveChips(){
    counter++;

    for(var i = 1; i < 7;i++){
        var chair = document.getElementById("chair"+i+"chip");
        var chair_rect = document.getElementById("chair"+i+"chip").getBoundingClientRect();
        
        var top = chair_rect.top + moveby[i-1].top - 100;
        var left = chair_rect.left + moveby[i-1].left - 40;
        
        chair.style.top = top+"px";
        chair.style.left = left+"px";
    }
    
    var player = document.getElementById("playerchip");
    var player_rect = document.getElementById("playerchip").getBoundingClientRect();

    var top = player_rect.top + moveby[6].top - 100;
    var left = player_rect.left + moveby[6].left - 40;

    player.style.top = top+"px";
    player.style.left = left+"px";
    
    animation_2 = requestAnimationFrame(moveChips);
    
    if(counter >= 20){
        counter = 0;
        cancelAnimationFrame(animation_2);
        for(var i = 1; i < 7; i++){
            $('#chair'+i+"chip").fadeOut(1, function(){
                for(var i = 0; i < 6; i++){
                    if(original_positions[i].holder == this.id){
                        document.getElementById(this.id).style.top = original_positions[i].top+"px";
                        document.getElementById(this.id).style.left = original_positions[i].left+"px";
                    }
                }
            });
        }
        $('#playerchip').fadeOut(1, function(){
            document.getElementById(this.id).style.top = original_positions[6].top+"px";
            document.getElementById(this.id).style.left = original_positions[6].left+"px";
            
        });
        update_pot();
    }
    
}

function intialize_moveby(){
    var dealer_rect = document.getElementById("potimage").getBoundingClientRect();
    for(var i = 1; i < 7;i++){
        var chair_rect = document.getElementById("chair"+i+"chip").getBoundingClientRect();
        
        var state = {
            top: (dealer_rect.top - chair_rect.top)/20,
            left: (dealer_rect.left - chair_rect.left)/20
        }
        moveby.push(state);
        
        var original_state = {
            top: chair_rect.top - 100,
            left: chair_rect.left - 40,
            holder:"chair"+i+"chip"
        }
        original_positions.push(original_state);
    }
    
    var player_rect = document.getElementById("playerchip").getBoundingClientRect();
    var state = {
        top: (dealer_rect.top - player_rect.top)/20,
        left: (dealer_rect.left - player_rect.left)/20
    }
    moveby.push(state);
    
    var original_state = {
        top: player_rect.top - 100,
        left: player_rect.left - 40,
        holder:"playerchip"
    }
    original_positions.push(original_state);
}




//updaters
function update_calls(data){
    for(var i in data){
        if(data[i].player != null){
            if(data[i].player.call > 0 && data[i].occupied == true){
                if(parseInt(i)+1 < 4){
                    $('#chair'+(parseInt(i)+1)+'chip').fadeIn(200);
                    $('#chair'+(parseInt(i)+1)+'call').fadeIn(200);
                    draw_amount("chair"+(parseInt(i)+1)+"call",data[i].player.call);
                }else if(parseInt(i)+1 == 7){
                    $('#playerchip').fadeIn(200);
                    $('#playercall').fadeIn(200);
                    
                    draw_amount("playercall",data[i].player.call);
                }else {
                    $('#chair'+(parseInt(i)+1)+'chip').fadeIn(200);
                    $('#chair'+(parseInt(i)+1)+'call').fadeIn(200);

                    var chair_rect = document.getElementById("chair"+(parseInt(i)+1)+"call").getBoundingClientRect();
                    var new_left = chair_rect.left - 145;

                    if(chair_rect.left - 145 == 505 || chair_rect.left - 145 == 555 || chair_rect.left - 145 == 545 ){}else{
                        document.getElementById("chair"+(parseInt(i)+1)+"call").style.left = new_left+"px";
                    }
                    draw_amount("chair"+(parseInt(i)+1)+"call",data[i].player.call);
                }
            }
        }
    }
    
}

function draw_amount(x,y){
    var place = document.getElementById(x);
    var placeCtx = place.getContext("2d");

    placeCtx.clearRect(0,0,place.width,place.height);
    placeCtx.font = "bold 35px Frosty";
    placeCtx.fillStyle = "white";
    placeCtx.textAlign = "center";

    placeCtx.fillText("$"+y, 110, 40,200);
}

var position = 10;
var game_positions = [];
function update_positions(data){
    var empty_pic = new Image();
    move_positions(data);
    
    empty_pic.onload = function(){
        for(var i = 0;i < 7;i++){
            var chair;
            
            if(data[i].occupied == false){
                var avail_pos = data[i].position + 1;
                allowed_list.push(avail_pos);
                
                if(i == 6){
                    chair = document.getElementById("player");
                }else {
                    var new_value = i + 1;
                    chair = document.getElementById("chair"+new_value);
                }
                chair.style.opacity = 0.8;
                
                var chairCtx = chair.getContext("2d");
                
                chairCtx.clearRect(0,0,chair.width,chair.height);
                chairCtx.drawImage(empty_pic, 0, 0, 512, 512, 8, 65, 240, 240);
            }else {
                if(i+1 == 7){
                    chair = document.getElementById("player");
                }else {
                    var new_value = i+1;
                    chair = document.getElementById("chair"+new_value);
                }
                var chairCtx = chair.getContext("2d");

                chair.style.opacity = 1;
                chairCtx.clearRect(0,0,chair.width,chair.height);
                chairCtx.font = "bold 35px Frosty";
                chairCtx.fillStyle = "F1ECE4";
                chairCtx.textAlign = "center";
                
                chairCtx.clearRect(0, 0, chair.width, 60);
                chairCtx.clearRect(0, 330, chair.width, 60);
        
                chairCtx.fillText(data[i].player.name, 120, 40);
                chairCtx.fillText("$"+data[i].player.amount, 120, 355);
                
                if(data[i].position + 1 == position){
                    chairCtx.fillText("You", 130, 200);
                }else{
                    chairCtx.fillText(""+(data[i].position+1)+"", 130, 200);
                }
            }
        }
        

    }
    
    empty_pic.src = "client/img/emptychair.png";
}

function update_dealer(x){
    var new_dealer;
    
    for(var i = 0; i < game_positions.length; i++){
        if(game_positions[i].position == x){
            new_dealer = i + 1;
        }
    }

    var chair_rect;
    
    if(new_dealer == 7){
        chair_rect = document.getElementById("player").getBoundingClientRect();
    }else{
        chair_rect = document.getElementById("chair"+new_dealer).getBoundingClientRect();
    }
    
    var dealer_sign_rect = document.getElementById("dealersign").getBoundingClientRect();
    var move_by_y = (chair_rect.top + 15 - dealer_sign_rect.top)/20;
    var move_by_x = (chair_rect.left + 110 - dealer_sign_rect.left)/20;
    
    var animation;
    var counter = 0;
    var new_top = dealer_sign_rect.top - 100;
    var new_left = dealer_sign_rect.left - 40;
    
    function dealer_move_animation(){
        counter++;
        new_top = new_top + move_by_y;
        new_left = new_left + move_by_x;
        document.getElementById("dealersign").style.top = new_top;
        document.getElementById("dealersign").style.left = new_left;
        
        animation = requestAnimationFrame(dealer_move_animation);
        if(counter >= 20){
            cancelAnimationFrame(animation);
        }
        
    }
    dealer_move_animation();

}

function update_cards(data){
    var card_1 = document.getElementById("playercard1");
    var card_2 = document.getElementById("playercard2");
    var cardCtx_1 = card_1.getContext("2d");
    var cardCtx_2 = card_2.getContext("2d");
    var cards = new Image();
    
    card_1.style.visibility = "visible";
    card_2.style.visibility = "visible";
    
    cardCtx_1.scale(2,2);
    cardCtx_2.scale(2,2);
    
    cards.onload = function(){
        cardCtx_1.drawImage(cards, 
                            ((data[0].typeID - 1)*168) + (data[0].typeID * 16) - (data[0].typeID * 0.417), 
                            ((data[0].suitID - 1)*252)+ (data[0].suitID * 16), 
                            168, 252, 0, 0, 80, 115);
        cardCtx_2.drawImage(cards, 
                            ((data[1].typeID - 1)*168) + (data[1].typeID * 16) - (data[1].typeID * 0.417), 
                            ((data[1].suitID - 1)*252)+ (data[1].suitID * 16), 
                            168, 252, 0, 0, 80, 115);
    }
    
    cards.src = "client/img/cards.png";
}

function update_pot(x){
    var pot = document.getElementById("pot");
    var potCtx = pot.getContext("2d");
    potCtx.clearRect(0, 0, pot.width, 20);
    
    var grd = potCtx.createLinearGradient(50,0,50,15);
    grd.addColorStop(0,"#FFD700");
    grd.addColorStop(1,"#FFA500");
    
    if(stage == 0){
         potCtx.scale(2,2);
    }
    
    potCtx.fillStyle = grd;
    potCtx.fillRect(0,0,110,28);
    
    
    potCtx.font = "bold 10px Frosty";
    potCtx.fillStyle = "black";
    potCtx.textAlign = "center";

    potCtx.fillText("$"+pot_amount, 25, 10);
    stage++;
}






//user's actions
function select_position(x){
    if(position == 10){
        position = x;
        
        if(allowed_list.includes(x)){
            allowed_list = [];

            socket.emit('take_place', (x-1));
        }
    }
}

function move_positions(data){
    var temp_return = data;
    
    if(position != 10){
    
        var timer = setInterval(function(){
            if(temp_return[6].position != position - 1){
                var first_value = temp_return[0];

                for(var i = 0; i < 7; i++){
                    if(i == 6){
                        temp_return[i] = first_value;
                    }else{
                        temp_return[i] = temp_return[i+1];
                    }
                }
                update_positions(temp_return);
            }else{
                clearInterval(timer);
            }
        },10);
    
    }
    
}

function get_right_order(data){
    var temp_return = data;
    
    if(position != 10){
        while(data[6].position != position - 1){
            var first_value = temp_return[0];

            for(var i = 0; i < 7; i++){
                if(i == 6){
                    temp_return[i] = first_value;
                }else{
                    temp_return[i] = temp_return[i+1];
                }
            }

        }
    }
    
    return temp_return;
}






//animations
function call_raise(x){
    var amount_to_subtract = Math.floor(x.change_by / 10);
    var chair;
    if(x.position == 7){
        chair = document.getElementById("player");
    }else{
        chair = document.getElementById("chair"+x.position);
    }
    var chairCtx = chair.getContext("2d");
    
    chairCtx.font = "bold 35px Frosty";
    chairCtx.fillStyle = "#F1ECE4";
    chairCtx.textAlign = "center";
        
    var animation;
    var counter = 0;  
    var current_amount = x.original_amount;
    
    function count_down(){
        counter++;
        current_amount -= amount_to_subtract;
        chairCtx.clearRect(0, 320, chair.width, 60);
        chairCtx.fillText("$"+current_amount, 120, 355);
        
        animation = requestAnimationFrame(count_down);
        
        if(counter >= 10){
            chairCtx.clearRect(0, 320, chair.width, 60);
            chairCtx.fillText("$"+(x.original_amount - x.change_by), 120, 355);
            cancelAnimationFrame(animation);
        }
        
    }
    
    count_down();
    
}

function fold(x){
    document.getElementById("chair"+x).style.opacity = 0.8;
}





//labels
function label(x, type){
    var chair = document.getElementById("chair"+x);
    var chairCtx = chair.getContext("2d");
    
    chairCtx.font = "bold 35px Frosty";
    chairCtx.fillStyle = "#F1ECE4";
    chairCtx.textAlign = "center";
    
    chairCtx.clearRect(0, 0, chair.width, 60);
    
    switch(type){
        case 0:
            chairCtx.fillText("Big Blind", 120, 40);
            break;
        case 1:
            chairCtx.fillText("Small Blind", 120, 40);
            break;
        case 2:
            chairCtx.fillText("Call", 120, 40);
            break;
        case 3:
            chairCtx.fillText("Raise", 120, 40);
            break;
        case 4:
            chairCtx.fillText("Fold", 120, 40);
            break;
        case 5:
            chairCtx.fillStyle = "#FFEF63";
            chairCtx.fillText("Check", 120, 40);
            break;
                
    }
}







//actions
function call(){
    socket.emit('call');
    
    document.getElementById("call").style.visibility = "hidden";
    document.getElementById("raise").style.visibility = "hidden";
    document.getElementById("fold").style.visibility = "hidden";
    document.getElementById("slider").style.visibility = "hidden";
    document.getElementById("value").style.visibility = "hidden";
}


function raise(){
    if(document.getElementById("raise").innerHTML == "OK"){
        socket.emit('raise', document.getElementById("slider").value);
        
        document.getElementById("call").style.visibility = "hidden";
        document.getElementById("raise").style.visibility = "hidden";
        document.getElementById("fold").style.visibility = "hidden";
        document.getElementById("slider").style.visibility = "hidden";
        document.getElementById("value").style.visibility = "hidden";
        document.getElementById("raise").innerHTML = "Raise";
    }else{
        document.getElementById("slider").style.visibility = "visible";
        document.getElementById("value").style.visibility = "visible";
        document.getElementById("raise").innerHTML = "OK";
    }
}

function change(){
    document.getElementById('value').innerHTML = "$"+ document.getElementById('slider').value;
}






















