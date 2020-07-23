module.exports = ()=>{
    var room_id = "";
    const alpha = ["A", "b", "C", "d", "E", "f", "G", "h"];
    for(var j = 0; j < 7; j++){
        const num = Math.round(Math.random() * 10);
        room_id += alpha[j];
        room_id += num;
    }
    return room_id;
};