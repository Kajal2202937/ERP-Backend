const TICKET_EVENTS = {
  JOIN_TICKET: "ticket:join",
  LEAVE_TICKET: "ticket:leave",
  JOIN_ADMIN: "ticket:join_admin",

  TICKET_NEW: "ticket:new",
  TICKET_REPLY: "ticket:reply",
  TICKET_RESOLVED: "ticket:resolved",
  TICKET_DELETED: "ticket:deleted",
  TICKET_UPDATED: "ticket:updated",

  TYPING: "ticket:typing",
  STOP_TYPING: "ticket:stop_typing",

  SEEN: "ticket:seen",

  USER_ONLINE: "ticket:user_online",
  USER_OFFLINE: "ticket:user_offline",

  ERROR: "ticket:error",
};

module.exports = { TICKET_EVENTS };
