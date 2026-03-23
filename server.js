const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const PlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    seasonRecords: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        matches: { type: Number, default: 0 }
    },
    overallRecords: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        matches: { type: Number, default: 0 }
    },
    image: { type: String, default: '' }
});

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    logo: { type: String },
    captain: {
        name: { type: String, default: '' },
        image: { type: String, default: '' }
    },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    nrr: { type: Number, default: 0 },
    points: { type: Number, default: 0 }
});

const Player = mongoose.model('Player', PlayerSchema);
const Team = mongoose.model('Team', TeamSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Admin Routes (Simple Key Protection)
const adminAuth = (req, res, next) => {
    const receivedKey = (req.headers['x-admin-key'] || '').trim();
    const expectedKey = (process.env.ADMIN_KEY || '').trim();
    
    if (receivedKey === expectedKey && expectedKey !== '') {
        next();
    } else {
        res.status(403).json({ message: 'Unauthorized' });
    }
};

// Verify Admin Key
app.get('/api/admin/verify', adminAuth, (req, res) => {
    res.json({ message: 'Authorized' });
});

// API Routes

// Register Player (Admin Only)
app.post('/api/register', adminAuth, async (req, res) => {
    try {
        const { name, email, image } = req.body;
        const newPlayer = new Player({ name, email, image });
        await newPlayer.save();
        res.status(201).json({ message: 'Player registered successfully' });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Email already registered' });
        } else {
            res.status(500).json({ message: 'Error registering player', error });
        }
    }
});

// Get All Players
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching players', error });
    }
});

// Get Statistics (Cap Holders and Top 10)
app.get('/api/stats', async (req, res) => {
    try {
        const orangeCap = await Player.findOne().sort({ 'seasonRecords.runs': -1 });
        const purpleCap = await Player.findOne().sort({ 'seasonRecords.wickets': -1 });
        
        const top10BatsmenSeason = await Player.find().sort({ 'seasonRecords.runs': -1 }).limit(10);
        const top10BatsmenOverall = await Player.find().sort({ 'overallRecords.runs': -1 }).limit(10);
        
        const top10BowlersSeason = await Player.find().sort({ 'seasonRecords.wickets': -1 }).limit(10);
        const top10BowlersOverall = await Player.find().sort({ 'overallRecords.wickets': -1 }).limit(10);

        res.json({
            caps: {
                orange: orangeCap,
                purple: purpleCap
            },
            leaderboards: {
                batting: {
                    season: top10BatsmenSeason,
                    overall: top10BatsmenOverall
                },
                bowling: {
                    season: top10BowlersSeason,
                    overall: top10BowlersOverall
                }
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error });
    }
});

// Get Top 5 Players of All Time (Weighted Score)
app.get('/api/stats/top-5-alltime', async (req, res) => {
    try {
        const top5 = await Player.aggregate([
            {
                $addFields: {
                    allTimeScore: {
                        $add: [
                            { $ifNull: ["$overallRecords.runs", 0] },
                            { $multiply: [{ $ifNull: ["$overallRecords.wickets", 0] }, 25] }
                        ]
                    }
                }
            },
            { $sort: { allTimeScore: -1 } },
            { $limit: 5 }
        ]);
        res.json(top5);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching top players', error });
    }
});

// Update Team Captain (Admin Only)
app.post('/api/admin/update-captain', adminAuth, async (req, res) => {
    try {
        const { id, captainName, captainImage } = req.body;
        await Team.findByIdAndUpdate(id, { 
            'captain.name': captainName, 
            'captain.image': captainImage 
        });
        res.json({ message: 'Team captain updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating captain', error });
    }
});

// Get Points Table
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.find().sort({ points: -1, nrr: -1 });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teams', error });
    }
});

// Update Player Records
app.post('/api/admin/update-player', adminAuth, async (req, res) => {
    try {
        const { id, seasonRecords, overallRecords, image } = req.body;
        await Player.findByIdAndUpdate(id, { seasonRecords, overallRecords, image });
        res.json({ message: 'Player records updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating player', error });
    }
});

// Update Team Stats
app.post('/api/admin/update-team', adminAuth, async (req, res) => {
    try {
        const { id, played, won, lost, nrr, points } = req.body;
        await Team.findByIdAndUpdate(id, { played, won, lost, nrr, points });
        res.json({ message: 'Team stats updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating team', error });
    }
});

// Notify All Players
app.post('/api/admin/notify', adminAuth, async (req, res) => {
    try {
        const players = await Player.find();
        const emails = players.map(p => p.email);

        if (emails.length === 0) {
            return res.json({ message: 'No players to notify' });
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: emails.join(','),
            subject: 'CPL Website Updated!',
            text: 'Hello Player,\n\nThe CPL website has been updated with new records and points table. Check it out now!\n\nBest regards,\nCPL Admin',
            html: '<p>Hello Player,</p><p>The CPL website has been updated with new records and points table. <a href="http://localhost:5000">Check it out now!</a></p><p>Best regards,<br>CPL Admin</p>'
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Notifications sent successfully' });
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).json({ message: 'Error sending notifications', error });
    }
});

// Serve Frontend (Catch-all for SPA)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Teams (if none exist or missing data)
const initTeams = async () => {
    const teamsData = [
        { name: 'CSK', logo: 'assets/CSK.svg', captain: { name: 'MS Dhoni', image: 'assets/CSK_CAPTAIN.jpeg' } },
        { name: 'MI', logo: 'assets/MI.svg', captain: { name: 'Rohit Sharma', image: 'assets/MI_CAPTAIN.jpeg' } },
        { name: 'RCB', logo: 'assets/RCB.svg', captain: { name: 'Virat Kohli', image: 'assets/RCB_CAPTAIN.jpeg' } },
        { name: 'KKR', logo: 'assets/KKR.svg', captain: { name: 'Shreyas Iyer', image: 'assets/KKR_CAPTAIN.jpeg' } },
        { name: 'DC', logo: 'assets/DC.svg', captain: { name: 'Rishabh Pant', image: 'assets/DC_CAPTAIN.jpeg' } },
        { name: 'PBKS', logo: 'assets/PBKS.svg', captain: { name: 'Shikhar Dhawan', image: 'assets/PBKS_CAPTAIN.jpeg' } },
        { name: 'SRH', logo: 'assets/SRH.svg', captain: { name: 'Pat Cummins', image: 'assets/SRH_CAPTAIN.jpeg' } },
        { name: 'LSG', logo: 'assets/LSG.svg', captain: { name: 'KL Rahul', image: 'assets/LSG_CAPTAIN.jpeg' } }
    ];

    for (const team of teamsData) {
        await Team.findOneAndUpdate(
            { name: team.name },
            { $set: { logo: team.logo, 'captain.name': team.captain.name, 'captain.image': team.captain.image } },
            { upsert: true, new: true }
        );
    }
    console.log('Teams data updated/initialized');
};

// Initialize Players (ensure legends exist)
const initPlayers = async () => {
    const mockPlayers = [
        { name: 'Virat Kohli', email: 'virat@cpl.com', overallRecords: { runs: 6500, wickets: 4, matches: 200 }, image: 'assets/RCB_CAPTAIN.jpeg' },
        { name: 'MS Dhoni', email: 'msd@cpl.com', overallRecords: { runs: 5000, wickets: 0, matches: 250 }, image: 'assets/CSK_CAPTAIN.jpeg' },
        { name: 'Rohit Sharma', email: 'rohit@cpl.com', overallRecords: { runs: 5800, wickets: 15, matches: 220 }, image: 'assets/MI_CAPTAIN.jpeg' },
        { name: 'Shreyas Iyer', email: 'stats@cpl.com', overallRecords: { runs: 2800, wickets: 5, matches: 150 }, image: 'assets/KKR_CAPTAIN.jpeg' },
        { name: 'Pat Cummins', email: 'cummo@cpl.com', overallRecords: { runs: 1200, wickets: 160, matches: 110 }, image: 'assets/SRH_CAPTAIN.jpeg' }
    ];
    for (const p of mockPlayers) {
        await Player.findOneAndUpdate({ email: p.email }, p, { upsert: true });
    }
    console.log('Mock legend players ensured');
};

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initTeams();
    await initPlayers();
});
