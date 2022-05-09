const express = require("express");
const app = express();
const PORT = 3001 || process.env.PORT;
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fileUpload = require("express-fileupload");
const path = require("path")
const nodemailer = require("nodemailer");
const TMClient = require("textmagic-rest-client");
const socketIO = require("socket.io");
const mongoose = require("mongoose");

const accountTransport = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: "shopperia.philippines@gmail.com",
        pass: "shopperia187"
    }
})

const connectionMongo = require("./connection/connection");
// const { createBrotliCompress } = require("zlib");
// const e = require("express");
// const db = mysql.createConnection(connectionMysql);

const CommuterRegister = require("./schema/register");
const DriverRegister = require("./schema/registerDriver");

app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(fileUpload());
app.use(cors({
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200
}))

async function connectMongo(){
    return mongoose.connect(connectionMongo.url, connectionMongo.params)
}

const server = connectMongo().then(app.listen(PORT, () => {
    console.log("Database Connected!");
})).catch((err) => {
    console.log(err);
})

const io = socketIO(server, {cors: {
    origin: "*",
    methods: "*",
    allowedHeaders: ["my-custom-header"],
    credentials: true
}});

function makeid(length) {
    var result           = '';
    var characters       = '0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

// const jwtverifier = (req, res, next) => {
//     const tokenFromUser = req.headers["x-access-token"];
//     const tokenFromSeller = req.headers["x-access-tokenseller"];

//     if(!tokenFromUser && !tokenFromSeller){
//         res.send({status: false, message: "No Token Received!"});
//     }
//     else{
//         if(tokenFromUser && !tokenFromSeller){
//             jwt.verify(tokenFromUser, "shopperiaprojectinsia102", (err, decode) => {
//                 if(err){
//                     res.send({status: false, message: "Token Denied!"});
//                 }
//                 else{
//                     req.userTokenID = decode.id;
//                     req.userTokenUserName = decode.userName;
//                     req.acc = "buyer";
//                     // console.log(decode.userName);
//                     // next();
//                     db.query("SELECT ver_status_one FROM verification_data WHERE user_id = ?", [decode.userName], (err, result) => {
//                         if(err){
//                             res.send({status: false, message: "Token Denied!"});
//                         }
//                         else{
//                             if(result.length == 0){
//                                 res.send({status: false, message: "Token Denied!"});
//                             }
//                             else{
//                                 if(result[0].ver_status_one == "unverified"){
//                                     res.send({status: false, message: "Token Denied!"});
//                                 }
//                                 else{
//                                     next();
//                                 }
//                             }
//                         }
//                     })
//                 }
//             })
//         }
//         else if(tokenFromSeller && !tokenFromUser){
//             jwt.verify(tokenFromSeller, "shopperiaprojectinsia102", (err, decode) => {
//                 if(err){
//                     res.send({status: false, message: "Token Denied!"});
//                 }
//                 else{
//                     const shopID = decode.userName;
//                     db.query("SELECT shopName FROM seller_accounts WHERE shopID = ?", shopID, (err, result) => {
//                         if(err){
//                             console.log(err);
//                         }
//                         else{
//                             req.userTokenID = decode.id;
//                             req.userTokenUserName = decode.userName;
//                             req.shop
//                             req.acc = "seller";
//                             req.shopName = result.map((item) => item.shopName).join("");
//                             // console.log(result.map((item) => item.shopName));
//                             // next();
//                             db.query("SELECT ver_status_one FROM verification_data WHERE user_id = ?", [decode.userName], (err, result) => {
//                                 if(err){
//                                     res.send({status: false, message: "Token Denied!"});
//                                 }
//                                 else{
//                                     if(result.length == 0){
//                                         res.send({status: false, message: "Token Denied!"});
//                                     }
//                                     else{
//                                         if(result[0].ver_status_one == "unverified"){
//                                             res.send({status: false, message: "Token Denied!"});
//                                         }
//                                         else{
//                                             next();
//                                         }
//                                     }
//                                 }
//                             })
//                         }
//                     })
//                 }
//             })
//             // console.log(tokenFromSeller);
//         }
//     }
// }

app.post('/registercommuter', (req, res) => {
    // console.log(req.body);

    const commuterData = new CommuterRegister({
        userID: `commuter_${makeid(7)}`,
        userType: "Commuter",
        firstName: req.body.firstName,
        middleName: req.body.middleName,
        lastName: req.body.lastName,
        mobileNumber: req.body.mobileNumber,
        email: req.body.email,
        pass: req.body.pass
    })

    commuterData.save().then(() => {
        res.send({status: true, message: "Successfully Registered!"});
    }).catch((err) => {
        res.send({status: false, message: "Cannot Successfully Register!"});
    });
})

app.post('/registerdriver', (req, res) => {
    // console.log(req.body);

    const driverData = new DriverRegister({
        userID: `driver_${makeid(7)}`,
        userType: "Driver",
        firstName: req.body.firstName,
        middleName: req.body.middleName,
        lastName: req.body.lastName,
        mobileNumber: req.body.mobileNumber,
        email: req.body.email,
        pass: req.body.pass,
        dlicense: req.body.dlicense,
        age: req.body.age
    })

    driverData.save().then(() => {
        res.send({status: true, message: "Successfully Registered!"});
    }).catch((err) => {
        res.send({status: false, message: "Cannot Successfully Register!"});
    });
})

app.post('/getLogin', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const accountType = req.body.accountType;
    
    if(accountType == "Commuter"){
        CommuterRegister.findOne({email: email, pass: password, userType: accountType}, (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                // console.log(result);
                if(!result){
                    // console.log("No Commuter Account")
                    res.send({status: false, message: "No Existing Account!"})
                }
                else{
                    const { userID, userType } = result;
                    // console.log(userID, userType);
                    const token = jwt.sign({userID}, "transpotrackverification", {
                        expiresIn: 60 * 60 * 24 * 7
                    })
                    res.send({status: true, message: "Logged In!", token: token})
                }
            }
        })
    }
    else if(accountType == "Driver"){
        DriverRegister.findOne({email: email, pass: password, userType: accountType}, (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                // console.log(result);
                if(!result){
                    // console.log("No Driver Account")
                    res.send({status: false, message: "No Existing Account!"})
                }
                else{
                    const { userID, userType } = result;
                    // console.log(userID, userType);
                    const token = jwt.sign({userID}, "transpotrackverification", {
                        expiresIn: 60 * 60 * 24 * 7
                    })
                    res.send({status: true, message: "Logged In!", token: token})
                }
            }
        })
    }

    // console.log(req.body);
})