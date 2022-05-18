const express = require("express");
const app = express();
const PORT = process.env.PORT || 3001;
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
const CommuterTravel = require("./schema/traveldatacommuter");
const DriverTravel = require("./schema/traveldatadriver");

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

// const server = connectMongo().then(app.listen(PORT, () => {
//     console.log("Database Connected!");
// })).catch((err) => {
//     console.log(err);
// })

const server_app = app.listen(PORT, () => {
    console.log(`Port Running: ${PORT}`)
    connectMongo().then(() => {
        console.log("Database Initialized!");
    }).catch((err) => {
        console.log(err);
    })
});

const io = socketIO(server_app, {cors: {
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

const jwtverifier = (req, res, next) => {
    const tokenFromCommuter = req.headers["x-access-tokencommuter"];
    const tokenFromDriver = req.headers["x-access-tokendriver"];

    if(!tokenFromCommuter && !tokenFromDriver){
        res.send({status: false, message: "No Token Received!"});
    }
    else{
        if(tokenFromCommuter && !tokenFromDriver){
            jwt.verify(tokenFromCommuter, "transpotrackverification", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                }
                else{
                    // console.log(decode);
                    const userID = decode.userID;

                    CommuterRegister.findOne({userID: userID}, (err, result) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            // console.log(result)
                            req.userData = result
                            next();
                        }
                    })
                }
            })
        }
        else if(tokenFromDriver && !tokenFromCommuter){
            jwt.verify(tokenFromDriver, "transpotrackverification", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                }
                else{
                    // console.log(decode);
                    const userID = decode.userID;

                    DriverRegister.findOne({userID: userID}, (err, result) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            // console.log(result)
                            req.userData = result
                            next();
                        }
                    })
                }
            })
            // console.log(tokenFromSeller);
        }
    }
}

app.post('/registercommuter', (req, res) => {
    // console.log(req.body);

    var user_id = `commuter_${makeid(7)}`;

    const commuterData = new CommuterRegister({
        userID: user_id,
        userType: "Commuter",
        firstName: req.body.firstName,
        middleName: req.body.middleName,
        lastName: req.body.lastName,
        mobileNumber: req.body.mobileNumber,
        email: req.body.email,
        pass: req.body.pass
    })

    commuterData.save().then(() => {
        // res.send({status: true, message: "Successfully Registered as Commuter!"});
        const commuterTravel = new CommuterTravel({
            userID: user_id,
            userType: "Commuter",
            destination: "Not Applied"
        })

        commuterTravel.save().then(() => {
            res.send({status: true, message: "Successfully Registered as Commuter!"});
        }).catch((err) => {
            res.send({status: false, message: "Cannot Successfully Register!"});
        })
    }).catch((err) => {
        res.send({status: false, message: "Cannot Successfully Register!"});
    });
})

app.post('/registerdriver', (req, res) => {
    // console.log(req.body);

    var user_id = `driver_${makeid(7)}`;

    const driverData = new DriverRegister({
        userID: user_id,
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
        // res.send({status: true, message: "Successfully Registered as Driver!"});
        const driverTravel = new DriverTravel({
            userID: user_id,
            userType: "Driver",
            destination: "Not Applied",
            destination_one: "Not Applied",
            destination_two: "Not Applied",
            vehicle: "Not Applied"
        })

        driverTravel.save().then(() => {
            res.send({status: true, message: "Successfully Registered as Driver!"})
        }).catch((err) => {
            res.send({status: false, message: "Cannot Successfully Register!"});
        })
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

app.get('/userData', jwtverifier, (req, res) => {
    // console.log(req.userData);
    res.send(req.userData);
});


//SOCKET SECTION

io.on("connection", socket => {
    
    socket.on("dataTransmit", userData => {
        socket.broadcast.emit("dataShare", userData);
    })

})

//SOCKET SECTION END