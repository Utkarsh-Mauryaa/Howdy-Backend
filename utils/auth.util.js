import jwt from 'jsonwebtoken'
export const cookieOptions = {
    maxAge: 10 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
}

export const sendToken = (res, user, code, message) => {
const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET)
return res.status(code).cookie("howdy-token", token, cookieOptions).json({
    success: true,
    user,
    message
});
}