const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors')
const studentRoutes = require('./Routes/studentRoutes')


const app = express();
const port = 3000;

connectDB();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin:'http://localhost:5173',
    credentials: true
}))
app.use(cookieParser());

app.use(studentRoutes);


app.get('/backend', (req, res) => {
    res.cookie('username', 'JohnDoe');
    res.send('Cookie has been set');
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
