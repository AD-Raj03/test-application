const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use(session({
    secret: 'test-application',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect('mongodb+srv://root:root@cluster0.rvhpgmj.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, callback) => {
        const imageFiles = fs.readdirSync('./public/uploads/');
        let imageCount = imageFiles.length;

        while (fs.existsSync(`./public/uploads/image${imageCount + 1}.jpg`)) {
            imageCount++;
        }

        const filename = `image${imageCount + 1}.jpg`;
        callback(null, filename);
    }
});

const upload = multer({
    storage: storage
});

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('upload');
});

const questionSchema = new mongoose.Schema({
    questionTitle: String,
    questionDescription: String,
    image: String,
    questionType: String,
    options: [
        {
            text: String,
            isCorrect: Boolean,
        },
    ],
});

const Question = mongoose.model('Question', questionSchema);

app.post('/upload', upload.single('image'), async (req, res) => {

    const questionData = JSON.parse(req.body.questionData);


    const imageFileName = req.file.filename;

    const options = [];
    options.push(questionData.options);



    const newQuestion = new Question({
        questionTitle: questionData.questionTitle,
        questionDescription: questionData.questionDescription,
        image: imageFileName,
        questionType: questionData.questionType,
        options: questionData.options,
    });

    try {

        await newQuestion.save();
        res.status(200).json({ success: true, message: 'Question created successfully!' });
    } catch (error) {
        console.error('Error saving question:', error);
        res.status(500).send('Error saving question');
    }
});



app.get('/questions', async (req, res) => {
    try {

        const questions = await Question.find();


        res.status(200).json({ success: true, questions: questions });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ success: false, message: 'Error fetching questions' });
    }
});


app.get('/images', (req, res) => {
    const imageFiles = fs.readdirSync('./public/uploads/');
    let currentIndex = req.session.currentIndex || 0;

    currentIndex = (currentIndex + imageFiles.length) % imageFiles.length;

    req.session.currentIndex = currentIndex;

    res.render('images', { images: imageFiles, currentIndex });
});

app.post('/next', (req, res) => {
    const imageFiles = fs.readdirSync('./public/uploads/');
    let currentIndex = req.session.currentIndex || 0;

    currentIndex = (currentIndex + 1) % (imageFiles.length);

    req.session.currentIndex = currentIndex;

    console.log('currentIndex:', currentIndex);
    res.json('/images');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
