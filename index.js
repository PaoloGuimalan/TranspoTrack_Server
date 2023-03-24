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
const CompanyRegData = require("./schema/companyRegData")
const BusData = require("./schema/buses")
const PostsData = require("./schema/postsdata")
const RoutesData = require("./schema/routes")
const BusStopsData = require("./schema/busstops")
const AssignedRoutes = require("./schema/assignedRoute")
const WaitingData = require("./schema/waiting");

const activeDriversList = Object.create(null)

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

function dateGetter(){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    return today = mm + '/' + dd + '/' + yyyy;
}

function timeGetter(){
    var today = new Date();
    var hour = String(today.getHours() % 12 || 12);
    var minutes = String(today.getMinutes() >= 9? today.getMinutes() : `0${today.getMinutes()}`)
    var seconds = String(today.getSeconds() >= 9? today.getSeconds() : `0${today.getSeconds()}`)
    var timeIndicator = hour >= 12? "am" : "pm"

    return today = `${hour}:${minutes}:${seconds} ${timeIndicator}`;
}

const jwtverifier = (req, res, next) => {
    const tokenFromCommuter = req.headers["x-access-tokencommuter"];
    const tokenFromDriver = req.headers["x-access-tokendriver"];
    // console.log("Err")

    if(!tokenFromCommuter && !tokenFromDriver){
        res.send({status: false, message: "No Token Received!"});
        // console.log("Err")
    }
    else{
        // console.log("Err")
        if(tokenFromCommuter && !tokenFromDriver){
            jwt.verify(tokenFromCommuter, "transpotrackverification", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                    console.log(err)
                }
                else{
                    // console.log(decode);
                    const userID = decode.userID;

                    CommuterRegister.findOne({userID: userID}, (err, result) => {
                        if(err){
                            console.log(err);
                            console.log("Err")
                        }
                        else{
                            // console.log(result)
                            console.log("Err")
                            req.params.userData = result
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

                    DriverRegister.findOne({userID: userID, status: true}, {email: 0, pass: 0, mobileNumber: 0, age: 0}, (err, result) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            // console.log(result)
                           if(result == null){
                                res.send({status: false, message: "Token Invalid", reestablish: true})
                           }
                           else{
                                BusData.findOne({driverID: userID}, (err2, result2) => {
                                    if(err2){
                                        console.log(err2)
                                        res.send({status: false, message: "Error scanning assigned bus"})
                                    }
                                    else{
                                        var companyID = result2.companyID;
                                        // AssignedRoutes.findOne({companyID: })
                                        AssignedRoutes.findOne({companyID: companyID}, (err3, result3) => {
                                            if(err3){
                                                console.log(err3)
                                                res.send({status: false, message: "Error scanning assigned routes"})
                                            }
                                            else{
                                                if(result3 == null){
                                                    req.params.userData = {
                                                        ...result._doc,
                                                        ...result2._doc
                                                    }
                                                    next();
                                                }
                                                else{
                                                    var routeID = result3.routeID;

                                                    RoutesData.findOne({routeID: routeID}, {stationList: 0, routePath: 0, dateAdded: 0, addedBy: 0, companyID: 0}, (err4, result4) => {
                                                        if(err4){
                                                            console.log(err4)
                                                            res.send({status: false, message: "Error scanning data of assigned routes"})
                                                        }
                                                        else{
                                                            // console.log(result4)
                                                            req.params.userData = {
                                                                ...result._doc,
                                                                ...result2._doc,
                                                                ...result4._doc
                                                            }
                                                            next();
                                                        }
                                                    })
                                                }
                                            }
                                        })
                                    }
                                })
                           }
                        }
                    })
                }
            })
            // console.log(tokenFromSeller);
        }
    }
}

app.get('/liveData', (req, res) => {
    res.send(activeDriversList)
})

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
    const companyID = req.body.companyID;

    var user_id = `driver_${makeid(7)}`;

    if(companyID == ""){
        res.send({status: false, message: "Please provide the Company ID where you work"})
    }
    else{
        CompanyRegData.findOne({companyID: companyID}, (err1, result1) => {
            if(err1){
                console.log(err1);
                res.send({status: false, message: "Error scanning Company ID"})
            }
            else{
                if(result1 != null){
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
                        age: req.body.age,
                        companyID: companyID,
                        dateRegistered: dateGetter(),
                        timeRegistered: timeGetter(),
                        status: false,
                        locationSharing: false
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
                }
                else{
                    res.send({status: false, message: "Company ID do not exist"})
                }
            }
        })
    }
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
                    if(result.status){
                        const { userID, userType } = result;
                        // console.log(userID, userType);
                        const token = jwt.sign({userID}, "transpotrackverification", {
                            expiresIn: 60 * 60 * 24 * 7
                        })
                        res.send({status: true, message: "Logged In!", token: token})
                    }
                    else{
                        res.send({status: false, message: "Account Disabled"})
                    }
                }
            }
        })
    }

    // console.log(req.body);
})

app.get('/userData', jwtverifier, (req, res) => {
    // console.log(req.userData);
    res.send({status: true, result: req.params.userData});
});

app.get('/userTravel/:userType', jwtverifier, (req, res) => {

    const userType = req.params.userType;

    if(userType == "Commuter"){
        CommuterTravel.findOne({userID: req.userData.userID, userType: userType}, (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                // console.log(result);
                if(result == null){
                    // console.log("Yes");
                    const commuterExcessData = {
                        userID: req.userData.userID,
                        userType: "Commuter",
                        destination: "Not Applied"
                    }

                    const commuterTravel = new CommuterTravel(commuterExcessData)
            
                    commuterTravel.save().then(() => {
                        res.send({status: true, result: commuterExcessData});
                    }).catch((err) => {
                        res.send({status: false, message: "Cannot Successfully Register!"});
                    })
                }
                else{
                    res.send({status: true, result: result});
                }
            }
        })
    }
    else if(userType == "Driver"){
        DriverTravel.findOne({userID: req.params.userData.userID, userType: userType}, (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                // console.log(result);
                if(result == null){
                    // console.log("Yes");
                    const driverExcessData = {
                        userID: req.userData.userID,
                        userType: "Driver",
                        destination: "Not Applied",
                        destination_one: "Not Applied",
                        destination_two: "Not Applied",
                        vehicle: "Not Applied"
                    }

                    const driverTravel = new DriverTravel(driverExcessData)
            
                    driverTravel.save().then(() => {
                        res.send({status: true, result: driverExcessData});
                    }).catch((err) => {
                        res.send({status: false, message: "Account Update Error!"});
                    })
                }
                else{
                    res.send({status: true, result: result});
                }
            }
        })
    }

    // console.log(req.userData.userID);
})

app.post('/commuterUpdateDestination', jwtverifier, (req, res) => {
    const userID = req.body.userID;
    const destination = req.body.destination;
    const userType = req.body.userType;

    if(userType == "Commuter"){
        CommuterTravel.updateOne({userID: userID}, {destination: destination}, (err, result) => {
            if(err){
                console.log(err);
                res.send({status: false, message: "Cannot update destination!"})
            }
            else{
                res.send({status: true, message: "Destination has been Updated!"});
            }
        })
    }
    else if(userType == "Driver"){
        DriverTravel.updateOne({userID: userID}, {destination: destination}, (err, result) => {
            if(err){
                console.log(err);
                res.send({status: false, message: "Cannot update destination!"})
            }
            else{
                res.send({status: true, message: "Destination has been Updated!"});
            }
        })
    }

    // console.log(userID, userType, destination)

    // console.log(userID, destination);
})

app.post('/driverUpdateRoute', jwtverifier, (req, res) => {
    const userID = req.body.userID;
    const destination_one = req.body.destination_one;
    const destination_two = req.body.destination_two;

    DriverTravel.updateOne({userID: userID}, {destination_one: destination_one, destination_two: destination_two}, (err, result) => {
        if(err){
            console.log(err);
            res.send({status: false, message: "Cannot Update Route!"})
        }
        else{
            res.send({status: true, message: "Route has been Updated!"});
        }
    })

    // console.log(userID, destination_one, destination_two);
})

app.get('/activeDriversRoute/:latitude/:longitude/:infotoggleclientstate', jwtverifier, (req, res) => {
    const userData = req.params.userData
    const infotoggle = req.params.userData.locationSharing
    const latitude = req.params.latitude;
    const longitude = req.params.longitude

    const infotoggleclientstate = req.params.infotoggleclientstate
    const userID = req.params.userData.userID

    // console.log({
    //     ...userData,
    //     latitude: latitude,
    //     longitude: longitude
    // })

    if(infotoggle == (infotoggleclientstate === 'true')){
        if(infotoggle){
            activeDriversList[userData.userID] = {
                ...userData,
                latitude: latitude,
                longitude: longitude
            }
            // console.log("TRUE", infotoggle)
            // console.log(infotoggleclientstate)
            res.send({status: true, message: "OK"})
        }
        else{
            // console.log("FALSE", infotoggle)
            delete activeDriversList[userData.userID]
            res.send({status: true, message: "OK"})
        }
    }
    else{
        // console.log("STATE DIFFERENCE", { infotoggle: infotoggle, clientstate: (infotoggleclientstate === 'true') })
        DriverRegister.findOneAndUpdate({userID: userID}, {locationSharing: infotoggleclientstate}, (err, result) => {
            if(err){
                console.log(err)
                res.send({status: false, message: "Cannot Update location sharing settings"})
            }
            else{
                // console.log(infotoggleclientstate)
                res.send({status: true, message: "OK"})
            }
        })
    }

    // console.log(infotoggle)
})

app.get('/clearLiveDataDriver', jwtverifier, (req, res) => {
    const userID = req.params.userData.userID

    delete activeDriversList[userID]

    res.send({status: true, message: "OK Delete"})
})

app.get('/subscribeDataDriver', jwtverifier, (req, res) => {
    const userID = req.params.userData.userID

    req.on("close", () => {
        DriverRegister.findOneAndUpdate({userID: userID}, {locationSharing: false}, (err, result) => {
            if(err){
                console.log(err)
                res.send({status: false, message: "Cannot Update location sharing settings"})
            }
            else{
                res.send({status: true, message: `Location sharing disabled`})
            }
        })
        
        delete activeDriversList[userID]
    })
})

app.get('/locationSharingToggle/:infotoggle', jwtverifier, (req, res) => {
    const userID = req.params.userData.userID
    const infotoggle = req.params.infotoggle

    DriverRegister.findOneAndUpdate({userID: userID}, {locationSharing: infotoggle}, (err, result) => {
        if(err){
            console.log(err)
            res.send({status: false, message: "Cannot Update location sharing settings"})
        }
        else{
            res.send({status: true, message: `Location sharing ${infotoggle? "enabled" : "disabled"}`})
        }
    })
})

app.get('/getPosts', jwtverifier, (req, res) => {
    const userID = req.params.userData.userID

    PostsData.find({$or: [{ viewers: "all" }, { viewers: "drivers" }]}, (err, result) => {
        if(err){
            console.log(err)
            res.send({status: false, message: "Unable to get posts"})
        }
        else{
            // console.log(result);
            res.send({status: true, result: result})
        }
    })
})

app.get('/enabledBusStops', jwtverifier, (req, res) => {
    BusStopsData.find({status: true}, (err, result) => {
        if(err){
            res.send({ status: false, result: { message: "Cannot fetch Bus Stops" } })
            console.log(err)
        }
        else{
            res.send({ status: true, result: result })
            // console.log(result)
        }
    })
})

app.get('/getDriverRoutes', jwtverifier, (req, res) => {
    const userID = req.params.userData.userID
    const companyID = req.params.userData.companyID

    AssignedRoutes.findOne({companyID: companyID}, (err, result) => {
        if(err){
            console.log(err)
            res.send({status: false, message: "Cannot scan assigned routes"})
        }
        else{
            if(result != null){
                var routeID = result.routeID

                RoutesData.findOne({routeID: routeID}, (err2, result2) => {
                    if(err2){
                        console.log(err2)
                        res.send({status: false, message: "Cannot scan route"})
                    }
                    else{
                        res.send({status: true, result: result2})
                    }
                })
                // console.log(routeID)
            }
            else{
                res.send({status: false, message: "No Assigned Routes yet"})
            }
        }
    })
})

app.get('/getWaitingCount', jwtverifier, (req, res) => {
    const userID = req.params.userData.userID
    const companyID = req.params.userData.companyID

    WaitingData.aggregate([
        { $group: {
            _id: "$busStopID",
            count: { $sum: {
                "$cond": [
                  {
                    "$eq": [
                      "$status",
                      "waiting"
                    ]
                  },
                  1,
                  0
                ]
              } }
        } }
    ], (err, result) => {
        if(err){
            console.log(err)
            res.send({status: false, message: "Error generating waiting count"})
        }
        else{
            res.send({status: true, result: result})
        }
    })
})


//SOCKET SECTION

// io.on("connection", socket => {
    
//     socket.on("dataTransmit", userData => {
//         socket.broadcast.emit("dataShare", userData);
//     })

// })

//SOCKET SECTION END