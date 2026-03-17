import express from "express";
import { adminLogin, adminLogout, getAdminData, getAllChats, getAllMessages, getAllUsers, getDashboardStats } from "../controllers/admin.controller.js";
import { adminAuthentication } from "../middlewares/auth.js";
import { adminLoginValidator, validateHandler } from "../utils/validators.js";



const router = express.Router();

router.post("/login", adminLoginValidator(), validateHandler, adminLogin);

router.use(adminAuthentication)
router.get("/",getAdminData);
router.get("/logout",adminLogout);
router.get("/users", getAllUsers);
router.get("/chats",getAllChats);
router.get("/messages",getAllMessages);
router.get("/stats",getDashboardStats);


export default router;