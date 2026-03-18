import {
  CALL_OFFER, CALL_ANSWER, CALL_ICE_CANDIDATE,
  CALL_INCOMING, CALL_ENDED, CALL_REJECTED, CALL_ACCEPTED,
} from '../constants/events.js'

export const registerCallHandlers = (io, socket, userSocketIds) => {
  const user = socket.user

  // Caller → Callee: relay offer
  socket.on(CALL_OFFER, ({ to, offer, type }) => {
    const targetSocketId = userSocketIds.get(to.toString())
    if (!targetSocketId) return
    io.to(targetSocketId).emit(CALL_INCOMING, {
      from: user._id.toString(),
      offer,
      type,
      caller: { _id: user._id, name: user.name, avatar: user.avatar?.[0]?.url || user.avatar?.[0] || user.avatar || null },
    })
  })

  // Callee → Caller: relay answer
  socket.on(CALL_ANSWER, ({ to, answer }) => {
    const targetSocketId = userSocketIds.get(to.toString())
    if (!targetSocketId) return
    io.to(targetSocketId).emit(CALL_ACCEPTED, { from: user._id.toString(), answer })
  })

  // Both directions: relay ICE candidates
  socket.on(CALL_ICE_CANDIDATE, ({ to, candidate }) => {
    const targetSocketId = userSocketIds.get(to.toString())
    if (!targetSocketId) return
    io.to(targetSocketId).emit(CALL_ICE_CANDIDATE, { from: user._id.toString(), candidate })
  })

  // Either side ended the call
  socket.on(CALL_ENDED, ({ to }) => {
    const targetSocketId = userSocketIds.get(to.toString())
    if (!targetSocketId) return
    io.to(targetSocketId).emit(CALL_ENDED, { from: user._id.toString() })
  })

  
  socket.on(CALL_REJECTED, ({ to }) => {
    const targetSocketId = userSocketIds.get(to.toString())
    if (!targetSocketId) return
    io.to(targetSocketId).emit(CALL_REJECTED, { from: user._id.toString() })
  })
}