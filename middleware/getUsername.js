const { request } = require("http");

module.exports = async(req, res, next)=>{
    const username = req.query.u;
    const type = req.query.type;
    if (username == undefined) {
        return res.redirect("back");
    };
    if(type == "create"){
        const player1 = await username;
        const data = {
            player: player1
        };
        req.data = await data;
        return next();
    }else{
        const player2 = await username;
       const data = {
           player: player2,
       };
      req.data = await data;
       return next();
    }
};