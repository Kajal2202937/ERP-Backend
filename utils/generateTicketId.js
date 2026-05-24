const Ticket = require("../models/Ticket");

const generateTicketId = async () => {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const count = await Ticket.countDocuments();
    const candidate = `TICKET-${String(1000 + count + attempt).padStart(4, "0")}`;

    
    const existing = await Ticket.findOne({ ticketId: candidate }).lean();
    if (!existing) {
      return candidate;
    }
  }

  
  return `TICKET-${Date.now()}`;
};

module.exports = generateTicketId;