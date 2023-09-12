const mongoose = require("mongoose");
const express = require("express");
const multer = require("multer");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: "test-application",
        resave: false,
        saveUninitialized: true,
    })
);

mongoose.connect(
    "mongodb+srv://root:root@cluster0.rvhpgmj.mongodb.net/?retryWrites=true&w=majority",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, callback) => {
        const imageFiles = fs.readdirSync("./public/uploads/");
        let imageCount = imageFiles.length;

        while (fs.existsSync(`./public/uploads/image${imageCount + 1}.jpg`)) {
            imageCount++;
        }

        const filename = `image${imageCount + 1}.jpg`;
        callback(null, filename);
    },
});

const upload = multer({
    storage: storage,
});

app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/upload", (req, res) => {
    res.render("upload");
});

app.get("/login", (req, res) => {
    res.render("login");
});

// Display the login form
app.get('/', (req, res) => {
    res.render("candidatelogin");
});

const questionSchema = new mongoose.Schema({
    questionId: {
        type: Number,
        default: 1000, 
        unique: true, 
    },
    questionTitle: String,
    questionDescription: String,
    image: String,
    questionType: String,
    questionTags: String,
    options: [
        {
            text: String,
            isCorrect: Boolean,
        },
    ],
});

const Question = mongoose.model("Question", questionSchema);

const user = new mongoose.Schema({
    username: String,
    password: String,
})

const User = mongoose.model("User", user);

const responseSchema = new mongoose.Schema({
    questionIndex: Number,
    responses: [String],
    timestamp: Date,
  });

  const Response = mongoose.model('Response', responseSchema);

  
const candidateSchema = new mongoose.Schema({
    email: String,
    securityCode: Number,
   
});

const Candidate = mongoose.model('Candidate', candidateSchema);


app.post('/candidates', async (req, res) => {
    try {
      const { email, securityCode } = req.body;
  
     
      const candidate = new Candidate({
        email,
        securityCode,
      });
  
      await candidate.save();
  
      res.status(201).json({ success: true, message: 'Candidate data saved successfully' });
    } catch (error) {
      console.error('Error saving candidate data:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  

app.post('/candidate-login', async (req, res) => {
    const { email, securityCode } = req.body;
    console.log(email, securityCode)

    try {
       
        const candidate = await Candidate.findOne({ email, securityCode });

        if (candidate) {
            
            res.redirect('/images');      
        } else {
            
            res.status(400).json({ success: false, message: 'Invalid data' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


  app.post('/save-response', async (req, res) => {
    const { questionIndex, responses: selectedOptions } = req.body;

    if (typeof questionIndex === 'number' && Array.isArray(selectedOptions)) {
        const responseDocument = new Response({
            questionIndex,
            responses: selectedOptions,
            timestamp: new Date(),
        });

        try {
            await responseDocument.save();
            res.status(200).json({ success: true, response: responseDocument });
        } catch (error) {
            console.error('Error saving response:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid data' });
    }
});


app.get('/thank-you', (req, res) => {
    
    if (req.session.thankYouShown) {
       
        return  res.render('thank-you');
    }
    req.session.thankYouShown = true;
    res.render('thank-you'); 
});



app.post("/login", async (req, res) => {
    const { username, password } = req.body;


    const user = await User.findOne({ username, password });

    if (user) {
       
        res.render('upload');
    } else {
        res
            .status(401)
            .json({ success: false, message: "Invalid username or password" });
    }
});

app.post("/upload", upload.single("image"), async (req, res) => {
    const questionData = JSON.parse(req.body.questionData);

    const imageFileName = req.file.filename;

    const latestQuestion = await Question.findOne().sort({ questionId: -1 });
        let newQuestionId = 1000; 

        if (latestQuestion) {
            newQuestionId = latestQuestion.questionId + 1;
        }


    const options = [];
    options.push(questionData.options);

    const newQuestion = new Question({
        questionId: newQuestionId,
        questionTitle: questionData.questionTitle,
        questionDescription: questionData.questionDescription,
        image: imageFileName,
        questionType: questionData.questionType,
        questionTags: questionData.questionTags,
        options: questionData.options,
    });

    try {
        await newQuestion.save();
        res
            .status(200)
            .json({ success: true, message: "Question created successfully!" });
    } catch (error) {
        console.error("Error saving question:", error);
        res.status(500).send("Error saving question");
    }
});

app.get("/questions", async (req, res) => {
    try {
        const questions = await Question.find();
        res.render('questions', { questions });
       // res.status(200).json({ success: true, questions: questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res
            .status(500)
            .json({ success: false, message: "Error fetching questions" });
    }
});

app.get("/images", (req, res) => {
    const imageFiles = fs.readdirSync("./public/uploads/");
    let currentIndex = req.session.currentIndex || 0;

    currentIndex = (currentIndex + imageFiles.length) % imageFiles.length;

    req.session.currentIndex = currentIndex;

    res.render("images", { images: imageFiles, currentIndex });
});

app.post("/next", (req, res) => {
    const imageFiles = fs.readdirSync("./public/uploads/");
    let currentIndex = req.session.currentIndex || 0;

    currentIndex = (currentIndex + 1) % imageFiles.length;

    req.session.currentIndex = currentIndex;

    console.log("currentIndex:", currentIndex);
    res.json("/images");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
