const mongoose = require("mongoose");

const traveldatadriver = mongoose.Schema({
    userID: {type: mongoose.Schema.Types.Mixed, required: true},
    userType: {type: String, required: true},
    destination: {type: mongoose.Schema.Types.Mixed, required: true},
    destination_one: {type: mongoose.Schema.Types.Mixed, required: true},
    destination_two: {type: mongoose.Schema.Types.Mixed, required: true},
    vehicle: {type: mongoose.Schema.Types.Mixed, required: true}
})

module.exports = mongoose.model("DriverTravelData", traveldatadriver, 'user_travel_data');