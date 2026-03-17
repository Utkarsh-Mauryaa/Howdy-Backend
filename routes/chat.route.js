import express from 'express'
import { isAuthenticated } from '../middlewares/auth.js';
import { addMembers, getChatDetails, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMembers, renameGroup, sendAttachments, deleteChat, getMessages } from '../controllers/chat.controller.js';
import { attachmentsMulter } from '../middlewares/multer.js';
import { addMembersValidator, chatIdValidator, newGroupChatValidator, removeMembersValidator, renameValidator, sendAttachmentsValidator, validateHandler } from '../utils/validators.js';


const router = express.Router();

router.use(isAuthenticated);

router.post('/new', newGroupChatValidator(), validateHandler, newGroupChat); 
router.get('/my', getMyChats);
router.get('/my/groups', getMyGroups);
router.put('/addMembers', addMembersValidator(), validateHandler, addMembers);
router.delete('/removeMember', removeMembersValidator(), validateHandler, removeMembers);
router.delete('/leave/:id', chatIdValidator(), validateHandler, leaveGroup);
router.post('/message', attachmentsMulter, sendAttachmentsValidator(), validateHandler, sendAttachments);
router.get('/message/:id', chatIdValidator(), validateHandler, getMessages);
router.route('/:id').get(chatIdValidator(), validateHandler, getChatDetails).put(renameValidator(), validateHandler, renameGroup).delete(chatIdValidator(), validateHandler, deleteChat);

export default router

