const mongoose = require("mongoose");

const traveldatacommuter = mongoose.Schema({
    userID: {type: mongoose.Schema.Types.Mixed, required: true},
    userType: {type: String, required: true},
    destination: {type: mongoose.Schema.Types.Mixed, required: true}
})

module.exports = mongoose.model("CommuterTravelData", traveldatacommuter, 'user_travel_data');