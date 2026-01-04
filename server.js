import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// MongoDB Connection
// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI && process.env.NODE_ENV === 'production') {
    console.error("Error: MONGO_URI environment variable is not defined.");
}

// Global cached connection for Serverless
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("Database Connection Failed:", err);
        res.status(500).json({ error: "Database connection failed", details: err.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    // In local development, we can just connect once normally if we wanted, 
    // but the middleware above handles it fine too. 
    // We just print a log for clarity.
    mongoose.connection.once('open', () => console.log('MongoDB Connected (Local via Middleware)'));
}

const apiRouter = express.Router();

// Health Check
apiRouter.get('/', (req, res) => {
    res.send('Worklify API is running');
});
apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});




// --- Schemas ---

const EmployeeSchema = new mongoose.Schema({
    id: Number,
    employeeId: String,
    name: String,
    email: String,
    role: String,
    phone: String,
    address: String,
    status: String,
    avatar: String,
    productivityScores: Array,
    attendanceSummary: Object,
    dailyTargets: Object,
    dailyProgress: Object,
    dailyProductivity: Object,
    dailyTaskReasons: Object,
    dailyProductivity: Object,
    dailyTaskReasons: Object,
    dailySubmitted: Object,
    password: { type: String, default: '123456' } // Default password
});

const AttendanceSchema = new mongoose.Schema({
    id: Number,
    employeeId: String,
    date: String,
    checkIn: String,
    checkOut: String,
    photo: String,
    location: Object
});

const TimeOffSchema = new mongoose.Schema({
    id: Number,
    employeeId: String,
    employeeName: String,
    type: String,
    leaveType: String,
    startDate: String,
    endDate: String,
    reason: String,
    status: String,
    rejectionCategory: String,
    rejectionReason: String
});

const PayrollSchema = new mongoose.Schema({
    id: Number,
    employeeId: String,
    employeeName: String,
    month: String,
    year: String,
    basic: Number,
    hra: Number,
    da: Number,
    deductions: Number,
    net: Number,
    generatedDate: String
});

const OfficeSchema = new mongoose.Schema({
    lat: Number,
    lng: Number,
    setAt: String
});

const Employee = mongoose.model('Employee', EmployeeSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const TimeOff = mongoose.model('TimeOff', TimeOffSchema);
const Payroll = mongoose.model('Payroll', PayrollSchema);
const Office = mongoose.model('Office', OfficeSchema);

// --- Routes ---

// Init Route
apiRouter.get('/init', async (req, res) => {
    try {
        const [employees, attendance, timeoff, payroll, office] = await Promise.all([
            Employee.find({}),
            Attendance.find({}),
            TimeOff.find({}),
            Payroll.find({}),
            Office.findOne({})
        ]);

        res.json({
            employees,
            attendance,
            timeoff,
            payroll,
            officeLocation: office || null
        });
    } catch (err) {
        console.error("API Init Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Employees
apiRouter.post('/employees', async (req, res) => {
    try {
        const emp = new Employee(req.body);
        await emp.save();
        res.json(emp);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.put('/employees/:id', async (req, res) => {
    try {
        await Employee.updateOne({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change Password
apiRouter.put('/change-password', async (req, res) => {
    try {
        const { employeeId, oldPassword, newPassword } = req.body;
        const emp = await Employee.findOne({ employeeId });
        if (!emp) return res.status(404).json({ error: 'Employee not found' });
        if ((emp.password || '123456') !== oldPassword) return res.status(400).json({ error: 'Incorrect current password' });
        emp.password = newPassword;
        await emp.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance
apiRouter.post('/attendance', async (req, res) => {
    try {
        const att = new Attendance(req.body);
        await att.save();
        res.json(att);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TimeOff
apiRouter.post('/timeoff', async (req, res) => {
    try {
        const t = new TimeOff(req.body);
        await t.save();
        res.json(t);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.put('/timeoff/:id', async (req, res) => {
    try {
        await TimeOff.updateOne({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Payroll
apiRouter.post('/payroll', async (req, res) => {
    try {
        const p = new Payroll(req.body);
        await p.save();
        res.json(p);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Office
apiRouter.post('/office', async (req, res) => {
    try {
        await Office.deleteMany({});
        const o = new Office(req.body);
        await o.save();
        res.json(o);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mount Router
app.use('/api', apiRouter);
// Fallback: If Vercel rewrites strip the prefix, handle it at root too.
app.use('/', apiRouter);
// Netlify specific mount (in case path is passed through)
app.use('/.netlify/functions/api', apiRouter);

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

export default app;
