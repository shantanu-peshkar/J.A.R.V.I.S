const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    task: { type: String, required: true },
    dateTime: { type: Date, required: true },
    recurring: { type: String, default: null },
    alerted: { type: Boolean, default: false }, // New field
});

module.exports = mongoose.model('Reminder', reminderSchema);