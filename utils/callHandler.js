// ─────────────────────────────────────────────────────────────────────────────
// WebRTC Signaling — your server never touches the actual audio/video data.
// It only relays small "signaling" messages between peers so they can find
// each other and establish a direct connection.
// ─────────────────────────────────────────────────────────────────────────────

import { getSockets } from '../utils/helper.js'
import {
  CALL_OFFER, CALL_ANSWER, CALL_ICE_CANDIDATE,
  CALL_INCOMING, CALL_ENDED, CALL_REJECTED, CALL_ACCEPTED,
} from '../constants/events.js'

export const registerCallHandlers = (io, socket, userSocketIds) => {
  const user = socket.user

  // ── Someone initiates a call ───────────────────────────────────────────────
  // Relay the offer + caller info to the target user
  socket.on(CALL_OFFER, ({ to, offer, chatId, type, isGroup, caller, membersMap }) => {
    console.log('CALL_OFFER received, to:', to)
    const targetSocketId = userSocketIds.get(to.toString())
     console.log('target socket:', targetSocketId)
    if (!targetSocketId) return // user is offline, could emit a "missed call" event here

    io.to(targetSocketId).emit(CALL_INCOMING, {
      from: user._id.toString(),
      offer,
      chatId,
      type,
      isGroup,
      caller: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
    })
  })

  // ── Callee accepts and sends back their answer ─────────────────────────────
  socket.on(CALL_ANSWER, ({ to, answer, chatId }) => {
    const targetSocketId = userSocketIds.get(to)
    if (!targetSocketId) return

    io.to(targetSocketId).emit(CALL_ACCEPTED, {
      from: user._id.toString(),
      answer,
      chatId,
    })
  })

  // ── ICE candidate exchange ─────────────────────────────────────────────────
  // These are network path candidates — WebRTC tries each one to find
  // the best route between the two peers
  socket.on(CALL_ICE_CANDIDATE, ({ to, candidate }) => {
    const targetSocketId = userSocketIds.get(to)
    if (!targetSocketId) return

    io.to(targetSocketId).emit(CALL_ICE_CANDIDATE, {
      from: user._id.toString(),
      candidate,
    })
  })

  // ── Someone ends the call ──────────────────────────────────────────────────
  socket.on(CALL_ENDED, ({ to }) => {
    const targetSocketId = userSocketIds.get(to)
    if (!targetSocketId) return

    io.to(targetSocketId).emit(CALL_ENDED, {
      from: user._id.toString(),
    })
  })

  // ── Someone rejects the call ───────────────────────────────────────────────
  socket.on(CALL_REJECTED, ({ to }) => {
    const targetSocketId = userSocketIds.get(to)
    if (!targetSocketId) return

    io.to(targetSocketId).emit(CALL_REJECTED, {
      from: user._id.toString(),
    })
  })
}