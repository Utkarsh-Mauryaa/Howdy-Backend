import express from 'express'
import {acceptFriendRequest, getMyFriends, getMyNotifications, getMyProfile, getUserInfo, Logout, searchUser, sendFriendRequest, SignIn, SignUp} from '../controllers/user.controller.js'
import { singleAvatar } from '../middlewares/multer.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from '../utils/validators.js';


const router = express.Router();

router.post('/signup',singleAvatar, registerValidator(), validateHandler, SignUp);

router.post('/signin', loginValidator(), validateHandler, SignIn);

router.use(isAuthenticated)

router.get("/me", getMyProfile);

router.get('/logout', Logout);
router.get('/search', searchUser);
router.put('/sendrequest', sendRequestValidator(), validateHandler, sendFriendRequest);
router.put('/acceptrequest', acceptRequestValidator(), validateHandler, acceptFriendRequest);
router.get('/getnotifications', getMyNotifications);
router.get('/getnameAvatar/:userId', getUserInfo);

router.get('/friends', getMyFriends)
export default router