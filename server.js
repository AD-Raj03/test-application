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

app.get("/", (req, res) => {
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
    correctOptions: [String],
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
});

const User = mongoose.model("User", user);

const candidateSchema = new mongoose.Schema({
    email: String,
    securityCode: Number,
});

const Candidate = mongoose.model("Candidate", candidateSchema);

const responseSchema = new mongoose.Schema({
    testName: String,
    name: String,
    emailId: String,
    testDate: Date,
    testDuration: String,
    startTime: Date,
    endTime: Date,
    timeTaken: String,
    responses: [
        {
            questionId: Number,
            selectedOptions: [String],
        },
    ],
});

const Response = mongoose.model("Response", responseSchema);

const resultSchema = new mongoose.Schema({
    testName: String,
    name: String,
    emailId: String,
    testDate: Date,
    testDuration: String,
    startTime: Date,
    endTime: Date,
    timeTaken: String,
    currentStatus: String,
    totalQuestion: Number,
    attemptedQuestoin: Number,
    correctCount: Number,
    wrongCount: Number,
    skippedQuestions: Number,
    result: String,
});

const Result = mongoose.model("Result", resultSchema);



// candidate creation api
app.post("/candidates", async (req, res) => {
    try {
        const { email, securityCode } = req.body;

        const candidate = new Candidate({
            email,
            securityCode,
        });

        await candidate.save();

        res
            .status(201)
            .json({ success: true, message: "Candidate data saved successfully" });
    } catch (error) {
        console.error("Error saving candidate data:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// candidate credential verification api
app.post("/candidate-login", async (req, res) => {
    const { email, securityCode } = req.body;
    console.log(email, securityCode);

    try {
        const candidate = await Candidate.findOne({ email, securityCode });

        if (candidate) {
            res.redirect("/images");
        } else {
            res.status(400).json({ success: false, message: "Invalid data" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/testmaster/api/save-response", async (req, res) => {
    const {
        testName,
        name,
        emailId,
        testDate,
        testDuration,
        startTime,
        endTime,
        responses,
    } = req.body;

    const timeDuration = endTime - startTime;
    const minutes = Math.floor(timeDuration / (1000 * 60));
    const seconds = Math.floor((timeDuration % (1000 * 60)) / 1000);
    // formating "mm:ss"
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const totalQuestion = responses.length;
    // console.log(totalQuestion);
    
    //console.log(attemptedQuestion);
    const responseDocument = new Response({
        testName,
        name,
        emailId,
        testDate,
        testDuration,
        startTime,
        endTime,
        timeTaken: formattedTime,
        responses,
    });

    

    try {
        await responseDocument.save();

        const attemptedQuestion = await incrementAttemptedQuestion(emailId);
        const correctCount = await calculateResult(emailId);
        const wrongCount = attemptedQuestion - correctCount;
        const skippedQuestions = totalQuestion - attemptedQuestion;
        let result = '';
        if(correctCount >= 2){
            result = 'Pass';
        }else{
            result = 'fail';
        }
        const resultData = {
            testName: testName,
            name: name,
            emailId: emailId,
            testDate: testDate,
            testDuration: testDuration, 
            startTime: startTime,
            endTime: endTime,
            timeTaken: formattedTime, 
            currentStatus: 'Completed',
            totalQuestion: totalQuestion,
            attemptedQuestoin: attemptedQuestion,
            correctCount: correctCount,
            wrongCount: wrongCount,
            skippedQuestions: skippedQuestions,
            result: result,
          };
    
          saveResult(resultData);


        res.status(200).json({ success: true, response: responseDocument });
    } catch (error) {
        console.error("Error saving response:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


async function incrementAttemptedQuestion(emailId) {
    try {
     
      const responses = await Response.find({ emailId });

      let attemptedQuestionCount = 0;   
      responses.forEach((response) => {
        response.responses.forEach((questionResponse) => {
          if (questionResponse.selectedOptions && questionResponse.selectedOptions.length > 0) {
            attemptedQuestionCount++;
          }
        });
      });
  
      console.log(`Attempted questions count for ${emailId}: ${attemptedQuestionCount}`);
      
      return attemptedQuestionCount; 
    } catch (error) {
      console.error('Error incrementing attemptedQuestion count:', error);
      throw error; 
    }
  }

  

  async function calculateResult(emailId) {
    try {
        const responseData = await Response.findOne({ emailId });
        
        if (!responseData || !responseData.responses || !Array.isArray(responseData.responses)) {
            console.warn(`Invalid response data for emailId ${emailId}.`);
            return 0; 
        }

        let correctAnswer = 0;

       
        for (const response of responseData.responses) {
            try {
                
                const question = await Question.findOne({ questionId: response.questionId });

                if (!question) {
                    console.warn(`Question with ID ${response.questionId} not found.`);
                    continue; 
                }

              
                const correctOptions = question.correctOptions.sort(); 
                const selectedOptions = response.selectedOptions.sort();

                if (JSON.stringify(correctOptions) === JSON.stringify(selectedOptions)) {
                    correctAnswer++;
                }
            } catch (error) {
                console.error('Error calculating result:', error);
            }
        }
        
        console.log(`Correct questions count for ${emailId}: ${correctAnswer}`);
        return correctAnswer;
    } catch (error) {
        console.error('Error fetching response data:', error);
        throw error; 
    }
}

  
  

async function saveResult(data) {
    try {
      
      const result = new Result(data);
  
     
      await result.save();
  
      console.log('Result saved successfully');
    } catch (error) {
      console.error('Error saving result:', error);
    }
  }

  app.get('/results', async (req, res) => {
    try {
       
        const results = await Result.find().sort({ testDate: -1 });

        res.render('result', { results });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/thank-you", (req, res) => {
    if (req.session.thankYouShown) {
        return res.render("thank-you");
    }
    req.session.thankYouShown = true;
    res.render("thank-you");
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (user) {
        res.render("upload");
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
    const correctOptions = [];
    questionData.options.forEach((option) => {
        if (option.isCorrect) {
            correctOptions.push(option.text);
        }
    });
    options.push(questionData.options);

    const newQuestion = new Question({
        questionId: newQuestionId,
        questionTitle: questionData.questionTitle,
        questionDescription: questionData.questionDescription,
        correctOptions: correctOptions,
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

app.get('/testmaster/api/edit-question/:questionId', async (req, res) => {
    try {
        const questionId = req.params.questionId;
        
        
        const questionData = await Question.findOne({ questionId });

        if (!questionData) {
            
            return res.status(404).json({ message: "Question not found" });
        }

        
        res.render('editquestions', { questionData });
    } catch (error) {
        console.error("Error fetching question data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});



app.put("/testmaster/api/questions/:questionId", async (req, res) => {
    try {
      const questionId = req.params.questionId;
      const updateData = req.body; 
  
      
      const updatedQuestion = await Question.findOneAndUpdate(
        { questionId },
        updateData,
        { new: true } 
      );
        
      if (!updatedQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      return res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

app.get("/questions-list", async (req, res) => {
    try {
        const questions = await Question.find();
        res.render("questions", { questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res
            .status(500)
            .json({ success: false, message: "Error fetching questions" });
    }
});

app.get("/questions", async (req, res) => {
    try {
        const questions = await Question.find();

        res.status(200).json({ success: true, questions: questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res
            .status(500)
            .json({ success: false, message: "Error fetching questions" });
    }
});

app.delete("/testmaster/api/questions/:id", async (req, res) => {
    try {
        const questionId = req.params.id;

        const question = await Question.findById(questionId);

        if (!question) {
            return res
                .status(404)
                .json({ success: false, message: "Question not found" });
        }

        const imageFileName = question.image;
        const imagePath = path.join(__dirname, "public", "uploads", imageFileName);

        fs.unlinkSync(imagePath);

        await Question.findByIdAndDelete(questionId);
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting question:", error);
        res
            .status(500)
            .json({ success: false, message: "Error deleting question" });
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
