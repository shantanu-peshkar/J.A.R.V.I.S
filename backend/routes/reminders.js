const express = require('express');
const router = express.Router();
const Reminder = require('../models/reminder');
const { isAuthenticated } = require('../middleware/auth');

router.post('/', isAuthenticated, async (req, res) => {
    try {
        const reminder = new Reminder({ ...req.body, userId: req.user.id }); // Use req.user.id for logged-in user
        await reminder.save();
        res.status(201).send(reminder);
    } catch (error) {
        res.status(400).send(error);
    }
});

router.get('/:userId', isAuthenticated, async (req, res) => {
    if (req.params.userId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized to access other users\' reminders.' });
    }
    try {
        const reminders = await Reminder.find({ userId: req.params.userId }).sort({ dateTime: 1 });
        res.send(reminders);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const reminder = await Reminder.findById(req.params.id);
        if (!reminder) {
            return res.status(404).send({ message: 'Reminder not found' });
        }
        if (reminder.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this reminder.' });
        }
        await Reminder.findByIdAndDelete(req.params.id);
        res.send({ message: 'Reminder deleted' });
    } catch (error) {
        res.status(500).send(error);
    }
});

router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const reminder = await Reminder.findById(req.params.id);
        if (!reminder) {
            return res.status(404).send({ message: 'Reminder not found' });
        }
        if (reminder.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to update this reminder.' });
        }
        const updatedReminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.send(updatedReminder);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;