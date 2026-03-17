import { body, check, param, query, validationResult } from "express-validator";
import { ErrorHandler } from "./utility.js";

const validateHandler = (req, res, next) => {
    const errors = validationResult(req);
    const errorMessages = errors.array().map(err => err.msg).join(", ");

    if(errors.isEmpty()) {
        return next();
    } else {
        next(new ErrorHandler(errorMessages, 400));
    }

}
const registerValidator = () => [
    body("name") // here each body field is a middleware function
        .notEmpty()
        .withMessage("Name is required"),
    body("username")
        .notEmpty()
        .withMessage("Username is required"),
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .notEmpty()
        .withMessage("Password is required")
        .matches(/[!@#$%^&*(),.?":{}|_<>-]/)
        .withMessage("Password must contain at least one special character"),
    body("bio")
        .isLength({ max: 150 })
        .withMessage("Bio cannot exceed 150 characters")
        .notEmpty()
        .withMessage("Bio is required"),
];

const loginValidator = () => [
    body("username")
        .notEmpty()
        .withMessage("Username is required"),
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .notEmpty()
        .withMessage("Password is required")
        .matches(/[!@#$%^&*(),.?":{}|_<>-]/)
        .withMessage("Password must contain at least one special character")
];

const newGroupChatValidator = () => [
    body("name")
        .notEmpty()
        .withMessage("Group chat name is required"),
    body("members")
        .notEmpty()
        .withMessage("Members are required")
        .isArray({ min: 2, max: 50 })
        .withMessage("There must be at least 2 and at most 50 members")
];

const addMembersValidator = () => [
    body("chatId")
        .notEmpty()
        .withMessage("Please enter chat ID"),
    body("members")
        .notEmpty()
        .withMessage("Members are required")
        .isArray({ min: 1, max: 47 })
        .withMessage("Members must be between 1 and 47")  
];

const removeMembersValidator = () => [
    body("chatId")
        .notEmpty()
        .withMessage("Please enter chat ID"),
    body("userId")
        .notEmpty()
        .withMessage("Please enter user ID")
];

const sendAttachmentsValidator = () => [
    body("chatId")
        .notEmpty()
        .withMessage("Please enter chat ID"),
];


const chatIdValidator = () => [
    param("id")
        .notEmpty()
        .withMessage("Please enter chat ID")
];

const renameValidator = () => [
    param("id")
        .notEmpty()
        .withMessage("Please enter chat ID"),
    body("name")
        .notEmpty()
        .withMessage("Please enter new group name")
];

const sendRequestValidator = () => [
    body("receiverId")
        .notEmpty()
        .withMessage("Please enter receiver ID")
];

const acceptRequestValidator = () => [
    body("requestId")
        .notEmpty()
        .withMessage("Please enter request ID"),
    body("accepted")
        .notEmpty()
        .withMessage("Please specify if the request is accepted or not")
        .isBoolean()
        .withMessage("Accepted must be a boolean value")

];

const adminLoginValidator = () => [
    body("secretKey", "Please enter the secret key").notEmpty()
]

export { registerValidator, validateHandler, loginValidator, newGroupChatValidator, addMembersValidator, removeMembersValidator, sendAttachmentsValidator, chatIdValidator, renameValidator, sendRequestValidator, acceptRequestValidator, adminLoginValidator };