import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { corsOptions } from "./config/corsConfig.js";
import { connectDB } from "./config/db.js";
import {
  CHAT_LEAVED,
  CHAT_OPENED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constants/events.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { errorMiddleware } from "./middlewares/error.js";
import { Message } from "./models/message.model.js";
import adminRouter from "./routes/admin.route.js";
import aiRoutes from './routes/ai.route.js';
import chatRouter from "./routes/chat.route.js";
import userRouter from "./routes/user.route.js";
import { getSockets } from "./utils/helper.js";
import { registerCallHandlers } from './utils/callHandler.js'

const app = express();
const server = new createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io); // new thing that i learnt

dotenv.config();
const port = 3000 || process.env.PORT;
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "skdjfksjfne";
export const userSocketIds = new Map();
export const onlineUsers = new Set();

connectDB();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRouter);
app.use('/api/v1/ai', aiRoutes)

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

io.on("connection", (socket) => {
  const user = socket.user;
  userSocketIds.set(user._id.toString(), socket.id);
  console.log(`A user is connected with ${socket.id}`);
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(), // used to generate random id
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const memberSocketIDs = getSockets(members); // here we have written this so that we can send messages to different users that are connected to socket with the help of their socketIDs
    io.to(memberSocketIDs).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(memberSocketIDs).emit(NEW_MESSAGE_ALERT, { chatId });
    try {
      await Message.create(messageForDB);
    } catch (e) {
      console.log(e);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSocketIds = getSockets(members);
    socket.to(membersSocketIds).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSocketIds = getSockets(members);
    socket.to(membersSocketIds).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_OPENED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers)); // we are sending array because we can't send set directly
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    userSocketIds.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers))
  });
  registerCallHandlers(io, socket, userSocketIds)
});

app.use(errorMiddleware);

server.listen(3000, () => {
  console.log(
    `Server is listening on port: ${port} in ${process.env.NODE_ENV} mode`,
  );
});
