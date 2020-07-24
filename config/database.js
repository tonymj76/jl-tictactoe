require("dotenv").config();
const mongoose = require("mongoose");

const {MONGODB_URI} = process.env;

module.exports = ()=>{
    mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (error, success)=>{
        if(error){
            console.log("Database connection failed!");
        }else{
            console.log("Database connection successful");
        }
    });
};