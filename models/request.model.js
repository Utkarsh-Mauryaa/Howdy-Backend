import mongoose, {Schema, model} from "mongoose";

const ObjectId = mongoose.ObjectId;

const requestSchema = new Schema({
status: {
    type: String,
    default: "pending",
    enum: ["pending","accepted","rejected"]
},
sender: {
    type: ObjectId,
    ref: "User",
    required: true
},
receiver: {
    type: ObjectId,
    ref: "User",
    required: true
},
}, {
    timestamps: true
})


export const Request = mongoose.models.Request || model("Request", requestSchema);


