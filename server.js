const express = require('express');
const { db, User, Project, Task } = require('./database/setup');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.use(session({
  secret: 'super-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 86400000
  }
}));

// Test database connection
async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}
testConnection();



// AUTH MIDDLEWARE

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        req.user = {
            id: req.session.userId,
            username: req.session.username
        };
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}



// AUTH ROUTES


// REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: 'User registered',
            user: { id: user.id, username, email }
        });

    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});


// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // CREATE SESSION
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            message: 'Login successful',
            user: { id: user.id, username: user.username, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});


// LOGOUT
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logout successful' });
    });
});


// PROJECT ROUTES


// GET projects (ONLY USER'S PROJECTS)
app.get('/api/projects', requireAuth, async (req, res) => {
    try {
        const projects = await Project.findAll({
            where: { userId: req.user.id }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// CREATE project
app.post('/api/projects', requireAuth, async (req, res) => {
    try {
        const { name, description, status, dueDate } = req.body;

        const newProject = await Project.create({
            name,
            description,
            status,
            dueDate,
            userId: req.user.id
        });

        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});



// TASK ROUTES


// GET all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.findAll();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// CREATE task
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, completed, priority, dueDate, projectId } = req.body;

        const newTask = await Task.create({
            title,
            description,
            completed,
            priority,
            dueDate,
            projectId
        });

        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});



// start server

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});