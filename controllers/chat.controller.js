import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS
} from "../constants/events.js";
import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import User from "../models/user.model.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { getOtherMember } from "../utils/helper.js";
import { ErrorHandler } from "../utils/utility.js";

export const newGroupChat = tryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  if (members.length < 2) {
    return next(
      new ErrorHandler("Group chat must have at least 3 members!", 400),
    );
  }
  const allMembers = [...members, req.userId];
  const chat = await Chat.create({
    name,
    groupChat: true,
    creator: req.userId,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Created!",
  });
});

export const getMyChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.userId }).populate(
    "members",
    "name avatar",
  );
  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.userId);
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((acc, curr) => {
        if (curr._id.toString() !== req.userId.toString()) {
          acc.push(curr._id);
        }
        return acc;
      }, []),
    };
  });
  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

export const getMyGroups = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.userId,
    groupChat: true,
    creator: req.userId,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));
  return res.status(200).json({
    success: true,
    groups,
  });
});

export const addMembers = tryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found!", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat.", 400));

  if (chat.creator.toString() !== req.userId.toString())
    return next(new ErrorHandler("You are not allowed to add members.", 403));

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));
  const allNewMembers = await Promise.all(allNewMembersPromise);
  const uniqueMembers = allNewMembers.filter(
    (i) => !chat.members.includes(i._id.toString()),
  );
  chat.members.push(...uniqueMembers.map((i) => i._id));

  if (chat.members.length > 10) {
    return next(new ErrorHandler("Group members limit reached!", 400));
  }

  await chat.save();
  const allUsersName = allNewMembers.map((i) => i.name).join(",");
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} has been added in the group.`,
  );
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Members added successfully!",
  });
});

export const removeMembers = tryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  const [chat, removedUser] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found!", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat.", 400));

  if (chat.creator.toString() !== req.userId.toString())
    return next(new ErrorHandler("You are not allowed to add members.", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  const allChatMembers = chat.members.map((i) => i.toString());

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString(),
  );
  await chat.save();
  emitEvent(
    req,
    ALERT,
    chat.members,
    {message:`${removedUser.name} has been removed from the group.`, chatId},
  );

  emitEvent(req, REFETCH_CHATS, allChatMembers);
  return res.status(200).json({
    success: true,
    message: "Member removed successfully!",
  });
});

export const leaveGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.userId.toString(),
  );
  if (remainingMembers.length < 3) {
    return next(new ErrorHandler("Group must have at least 3 members", 400));
  }

  if (chat.creator.toString() === req.userId.toString()) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
    const newCreatorName = await User.findById(newCreator, "name");
    emitEvent(req, ALERT, chat.members, `User ${newCreatorName.name} is the new group admin now.`);
  }
  chat.members = remainingMembers;
  const [user] = await Promise.all([
    User.findById(req.userId, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {chatId, message:`User ${user.name} has left the group.`});
  res.status(200).json({
    success: true,
    message: "You have left the group successfully",
  });
});

export const sendAttachments = tryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];
  if (files.length < 1)
    return next(new ErrorHandler("Please upload at least one attachment", 400));
  if (files.length > 5)
    return next(
      new ErrorHandler("You can send maximum 5 attachments at a time", 400),
    );
  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.userId, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found.", 404));

  if (files.length < 1)
    return next(new ErrorHandler("Please provide attachments", 400));

  const attachments = await uploadFilesToCloudinary(files);
  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };
  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  const message = await Message.create(messageForDB);
  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

export const getChatDetails = tryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean(); // lean converts mongoose document to plain js object
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      // this will not work (if you don't use lean()) because in the schema avatar is an object with url and publicId but here in the schema avatar should be an object but we are destructuring it as if it's a string
      _id,
      name,
      avatar: avatar.url, // here we are turning an object into a string, Mongoose looks at the schema and says: wait the avatar field for a member is supposed to be an object with 2 properties but you are assigning a string to it.This is invalid so i'm ignore this change or cast it incorrectly.
    }));

    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

export const renameGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const { name } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creator.toString() !== req.userId.toString()) {
    return next(
      new ErrorHandler("You are not allowed to rename the group", 403),
    );
  }
  chat.name = name;
  await chat.save();
  emitEvent(req, ALERT, chat.members, `Group renamed to ${name}`);
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group renamed successfully",
  });
});

export const deleteChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.userId.toString()) {
    return next(
      new ErrorHandler("You are not allowed to delete the group", 403),
    );
  }
  if (!chat.groupChat && !members.includes(req.userId)) {
    return next(
      new ErrorHandler("You are not allowed to delete this chat", 403),
    );
  }
  
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const publicIds = [];
  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ publicId }) => {
      publicIds.push(publicId);
    });
  });
  await Promise.all([
    deleteFilesFromCloudinary(publicIds),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

export const getMessages = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const messagesPerPage = 20;
  const skip = (page - 1) * messagesPerPage;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.members.includes(req.userId)) {
    return next(new ErrorHandler("You are not allowed to view messages", 403));
  }

  const [messages, totalMessages] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 }) // Changed to descending order (-1)
      .skip(skip)
      .limit(messagesPerPage)
      .populate("sender", "name")
      .lean(),

    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessages / messagesPerPage);

  return res.status(200).json({
    success: true,
    messages: messages.reverse(), // Reverse to show oldest first in the array
    totalPages,
  });
});
