import { userSocketIds } from "../app.js";

export const getOtherMember = (members, userId) => {
return members.find(member => member._id.toString() !== userId.toString());
}

export const getSockets = (users=[]) => {
const socketIDs = users.map(user => userSocketIds.get(user.toString()))  // this will give you the socket ids of a particular user
return socketIDs;
}

export const getBase64 = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;