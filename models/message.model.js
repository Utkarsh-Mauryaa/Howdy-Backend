import mongoose, {Schema, model} from "mongoose";

const ObjectId = mongoose.ObjectId;

const messageSchema = new Schema({
content: {
    type: String
},
sender: {
    type: ObjectId,
    ref: "User",
    required: true
},
chat: {
    type: ObjectId,
    ref: "Chat",
    required: true
},
attachments: [{
    publicId: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true
    }
}]
}, {
    timestamps: true
})


export const Message = mongoose.models.Message || model("Message", messageSchema);


